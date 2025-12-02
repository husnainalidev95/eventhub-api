export class TicketResponseDto {
  id: string;
  bookingId: string;
  userId: string;
  eventId: string;
  ticketTypeId: string;
  ticketCode: string;
  qrCodeData: string;
  seatNumber?: string;
  status: string;
  usedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Optional related data
  event?: {
    id: string;
    title: string;
    date: Date;
    time: string;
    venue: string;
    city: string;
    address: string;
    image?: string;
  };

  ticketType?: {
    id: string;
    name: string;
    price: number;
    description?: string;
  };

  booking?: {
    id: string;
    bookingCode: string;
    quantity: number;
    totalAmount: number;
    status: string;
  };
}
