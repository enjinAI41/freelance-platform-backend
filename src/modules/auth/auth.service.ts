import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RoleName } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

type JwtPayload = {
  sub: number;
  email: string;
  roles: RoleName[];
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async hashData(raw: string): Promise<string> {
    // bcrypt cost factor: 10 okul projesi icin yeterli
    return bcrypt.hash(raw, 10);
  }

  private async compareHash(raw: string, hash: string): Promise<boolean> {
    return bcrypt.compare(raw, hash);
  }

  private async signTokens(payload: JwtPayload) {
    const accessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    const accessExpires = this.configService.get<string>('JWT_ACCESS_EXPIRES', '15m');
    const refreshExpires = this.configService.get<string>('JWT_REFRESH_EXPIRES', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpires,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpires,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    // Rol seed unutulsa bile register akisi kirilmasin diye rol kaydini garanti et.
    const role = await this.prisma.role.upsert({
      where: { name: dto.role },
      update: {},
      create: { name: dto.role },
    });

    const passwordHash = await this.hashData(dto.password);

    // Kullanici ve rol atamasi tek create zincirinde aciliyor
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        // fullName zorunlu ise email'den default ad uretir
        fullName: dto.email.split('@')[0],
        passwordHash,
        userRoles: {
          create: [{ roleId: role.id }],
        },
      },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    const roles = user.userRoles.map((r) => r.role.name as RoleName);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles,
    };

    const tokens = await this.signTokens(payload);

    // Refresh token hash olarak tutulur (plain token DB'ye yazilmaz)
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: await this.hashData(tokens.refreshToken),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        roles,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await this.compareHash(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = user.userRoles.map((r) => r.role.name as RoleName);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles,
    };

    const tokens = await this.signTokens(payload);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: await this.hashData(tokens.refreshToken),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        roles,
      },
      ...tokens,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new ForbiddenException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    if (!user?.refreshTokenHash) {
      throw new ForbiddenException('Access denied');
    }

    const valid = await this.compareHash(dto.refreshToken, user.refreshTokenHash);
    if (!valid) {
      throw new ForbiddenException('Access denied');
    }

    const roles = user.userRoles.map((r) => r.role.name as RoleName);
    const nextPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles,
    };

    const tokens = await this.signTokens(nextPayload);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: await this.hashData(tokens.refreshToken),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        roles,
      },
      ...tokens,
    };
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    return { message: 'Logged out successfully' };
  }
}
