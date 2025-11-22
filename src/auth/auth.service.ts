import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';
import { hashPassword, comparePasswords } from './utils/password.util';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private generateToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, name, phone } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
      },
    });

    // Remove password from response
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
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Compare passwords
    const isPasswordValid = await comparePasswords(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Generate JWT token
    const accessToken = this.generateToken(user.id, user.email);

    return {
      user: userWithoutPassword,
      accessToken,
    };
  }
}
