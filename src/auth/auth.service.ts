import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { Role as PrismaRole } from '../generated/prisma/client';
import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import {
  BootstrapAdminDto,
  ChangePasswordDto,
  CreateAdminDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
} from './dto/login.dto';
import { hashPassword, verifyPassword } from './password.util';
import { createToken, verifyToken } from './token.util';

@Injectable()
export class AuthService {
  private static readonly PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  async login(loginDto: LoginDto): Promise<{
    accessToken: string;
    user: { id: string; email: string; role: Role };
  }> {
    const { email, password } = loginDto;

    const user = await this.prisma.adminUser.findUnique({
      where: { email },
    });

    if (!user || !(await verifyPassword(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive.');
    }

    const accessToken = createToken({
      sub: user.id,
      email: user.email,
      role: user.role as Role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role as Role,
      },
    };
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ accepted: true; resetCode?: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.adminUser.findUnique({
      where: { email },
      select: { id: true, isActive: true },
    });

    // Do not reveal whether account exists.
    if (!user || !user.isActive) {
      return { accepted: true };
    }

    const resetCode = this.generateResetCode();
    const passwordResetTokenHash = this.hashResetToken(resetCode);
    const passwordResetExpiresAt = new Date(
      Date.now() + AuthService.PASSWORD_RESET_TTL_MS,
    );

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash,
        passwordResetExpiresAt,
      },
    });

    // TODO: Send resetCode to user email address.
    if (process.env.NODE_ENV === 'production') {
      return { accepted: true };
    }

    return { accepted: true, resetCode };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ changed: true }> {
    const { code, newPassword } = resetPasswordDto;
    const passwordResetTokenHash = this.hashResetToken(code);
    const user = await this.prisma.adminUser.findFirst({
      where: {
        passwordResetTokenHash,
        passwordResetExpiresAt: { gt: new Date() },
        isActive: true,
      },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    if (await verifyPassword(newPassword, user.password)) {
      throw new BadRequestException(
        'New password must be different from current password.',
      );
    }

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(newPassword),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    return { changed: true };
  }

  async bootstrap(bootstrapAdminDto: BootstrapAdminDto): Promise<{
    id: string;
    email: string;
    role: Role;
  }> {
    const userCount = await this.prisma.adminUser.count();
    if (userCount > 0) {
      throw new BadRequestException(
        'Bootstrap is only allowed before any user is created.',
      );
    }

    const { email, password, role: inputRole } = bootstrapAdminDto;
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPassword = password?.trim();

    const role =
      inputRole === Role.CredsureAdmin ||
      inputRole === Role.SuzukiAdmin ||
      inputRole === Role.SuperAdmin
        ? inputRole
        : Role.SuperAdmin;

    const user = await this.prisma.adminUser.create({
      data: {
        email: normalizedEmail,
        password: await hashPassword(normalizedPassword),
        role: role as PrismaRole,
        isActive: true,
      },
      select: { id: true, email: true, role: true },
    });

    return { id: user.id, email: user.email, role: user.role as Role };
  }

  async registerAdmin(
    actorRole: Role,
    createAdminDto: CreateAdminDto,
  ): Promise<{ id: string; email: string; role: Role }> {
    if (actorRole !== Role.SuperAdmin) {
      throw new UnauthorizedException(
        'Only SUPER_ADMIN can create admin users.',
      );
    }

    const { email, password, role } = createAdminDto;
    const existing = await this.prisma.adminUser.findUnique({
      where: { email },
    });
    if (existing) {
      throw new BadRequestException('Email already exists.');
    }

    const created = await this.prisma.adminUser.create({
      data: {
        email,
        password: await hashPassword(password),
        role: role as PrismaRole,
        isActive: true,
      },
      select: { id: true, email: true, role: true },
    });

    return { id: created.id, email: created.email, role: created.role as Role };
  }

  async me(token: string): Promise<{ id: string; email: string; role: Role }> {
    const payload = verifyToken(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid token.');
    }

    const user = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return { id: user.id, email: user.email, role: user.role as Role };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ changed: true }> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
      select: { id: true, password: true, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive.');
    }

    const currentPasswordValid = await verifyPassword(
      currentPassword,
      user.password,
    );

    if (!currentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    if (await verifyPassword(newPassword, user.password)) {
      throw new BadRequestException(
        'New password must be different from current password.',
      );
    }

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(newPassword),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    return { changed: true };
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateResetCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }
}
