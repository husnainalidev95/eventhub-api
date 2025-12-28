import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  UpdateProfileDto,
  ChangePasswordDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { hashPassword, comparePasswords } from './utils/password.util';
import { UsersRepository } from './users.repository';
import { EmailVerificationJob, PasswordResetJob } from '../queues/processors/email.processor';

@Injectable()
export class AuthService {
  constructor(
    private usersRepository: UsersRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  private generateToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }

  private generateVerificationToken(userId: string, email: string): string {
    const payload = { sub: userId, email, type: 'email_verification' };
    return this.jwtService.sign(payload, { expiresIn: '24h' });
  }

  private generateResetToken(userId: string, email: string): string {
    const payload = { sub: userId, email, type: 'password_reset' };
    return this.jwtService.sign(payload, { expiresIn: '1h' });
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, name, phone } = registerDto;

    // Check if user already exists
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await this.usersRepository.create({
      email,
      password: hashedPassword,
      name,
      phone,
    });

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    // Generate JWT token
    const accessToken = this.generateToken(user.id, user.email);

    return {
      user: userWithoutPassword,
      accessToken,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare passwords
    const isPasswordValid = await comparePasswords(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    // Generate JWT token
    const accessToken = this.generateToken(user.id, user.email);

    return {
      user: userWithoutPassword,
      accessToken,
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const updatedUser = await this.usersRepository.update(userId, {
      ...updateProfileDto,
    });

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = updatedUser;

    return userWithoutPassword;
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    // Get user with password
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isPasswordValid = await comparePasswords(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is different
    if (currentPassword === newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await this.usersRepository.update(userId, {
      password: hashedPassword,
    });

    return {
      message: 'Password changed successfully',
    };
  }

  async sendVerificationEmail(userId: string) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate verification token
    const token = this.generateVerificationToken(user.id, user.email);

    // Get frontend URL from config or use default
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

    // Queue verification email
    try {
      await this.emailQueue.add('email-verification', {
        email: user.email,
        data: {
          userName: user.name,
          verificationLink,
        },
      } as EmailVerificationJob);
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to queue verification email:', error);
    }

    return {
      message: 'Verification email sent successfully',
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { token } = verifyEmailDto;

    try {
      // Verify token
      const payload = this.jwtService.verify(token);

      // Check token type
      if (payload.type !== 'email_verification') {
        throw new BadRequestException('Invalid token type');
      }

      // Find user
      const user = await this.usersRepository.findByEmail(payload.email);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.emailVerified) {
        throw new BadRequestException('Email is already verified');
      }

      // Update user
      await this.usersRepository.update(user.id, {
        emailVerified: true,
      });

      return {
        message: 'Email verified successfully',
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestException('Verification token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new BadRequestException('Invalid verification token');
      }
      throw error;
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Find user by email
    const user = await this.usersRepository.findByEmail(email);

    // Always return success to prevent email enumeration
    // If user exists, send reset email; if not, just return success
    if (user && user.isActive) {
      // Generate reset token
      const token = this.generateResetToken(user.id, user.email);

      // Get frontend URL from config or use default
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const resetLink = `${frontendUrl}/reset-password?token=${token}`;

      // Queue password reset email
      try {
        await this.emailQueue.add('password-reset', {
          email: user.email,
          data: {
            userName: user.name,
            resetLink,
          },
        } as PasswordResetJob);
      } catch (error) {
        // Log error but don't fail the request
        console.error('Failed to queue password reset email:', error);
      }
    }

    // Always return success message (security best practice)
    return {
      message: 'If an account exists with this email, a password reset link has been sent',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    try {
      // Verify token
      const payload = this.jwtService.verify(token);

      // Check token type
      if (payload.type !== 'password_reset') {
        throw new BadRequestException('Invalid token type');
      }

      // Find user
      const user = await this.usersRepository.findByEmail(payload.email);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      await this.usersRepository.update(user.id, {
        password: hashedPassword,
      });

      return {
        message: 'Password reset successfully',
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestException('Reset token has expired. Please request a new one.');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new BadRequestException('Invalid reset token');
      }
      throw error;
    }
  }
}
