import {
  ForbiddenException,
  Injectable,
  Logger,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
};

export type FormProtectionPayload = {
  website?: string;
  formStartedAt: string;
};

@Injectable()
export class FormProtectionService {
  private readonly logger = new Logger(FormProtectionService.name);
  private readonly allowedOrigins: Set<string>;
  private readonly minSubmissionMs: number;
  private readonly maxSubmissionMs: number;
  private readonly isProduction: boolean;

  constructor(private readonly config: ConfigService) {
    this.allowedOrigins = this.parseAllowedOrigins(
      this.config.get<string>('FORM_ALLOWED_ORIGINS')
    );
    this.minSubmissionMs = this.config.get<number>('FORM_MIN_SUBMISSION_MS', 2000);
    this.maxSubmissionMs = this.config.get<number>('FORM_MAX_SUBMISSION_MS', 43_200_000);
    this.isProduction = this.config.get<string>('NODE_ENV') === 'production';
  }

  async evaluateSubmission(payload: FormProtectionPayload, req: RequestLike, formName: string) {
    const ip = this.extractClientIp(req);
    const userAgent = this.getHeader(req, 'user-agent');

    this.ensureJsonContentType(req);
    this.ensureOriginAllowed(req);

    const silentDropReason = this.getSilentDropReason(payload);
    if (silentDropReason) {
      this.logger.warn(
        `Silently dropped ${formName} submission: ${silentDropReason} (ip=${ip || 'unknown'})`
      );

      return {
        shouldDropSilently: true,
        ip,
        userAgent,
      };
    }

    return {
      shouldDropSilently: false,
      ip,
      userAgent,
    };
  }

  private parseAllowedOrigins(rawValue?: string) {
    if (!rawValue) return new Set<string>();

    const values = rawValue
      .split(',')
      .map((item) => this.normalizeOrigin(item))
      .filter((item): item is string => Boolean(item));

    return new Set(values);
  }

  private normalizeOrigin(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    try {
      return new URL(trimmed).origin;
    } catch {
      return undefined;
    }
  }

  private getHeader(req: RequestLike, key: string) {
    const value = req.headers?.[key] ?? req.headers?.[key.toLowerCase()];
    if (Array.isArray(value)) return value[0];
    return value;
  }

  private extractClientIp(req: RequestLike) {
    const forwardedFor = this.getHeader(req, 'x-forwarded-for');
    if (forwardedFor) {
      const fromForwarded = forwardedFor.split(',')[0]?.trim();
      if (fromForwarded) return fromForwarded.replace(/^::ffff:/, '');
    }

    const realIp = this.getHeader(req, 'x-real-ip');
    if (realIp) return realIp.replace(/^::ffff:/, '');

    if (req.ip) return req.ip.replace(/^::ffff:/, '');
    if (req.socket?.remoteAddress) return req.socket.remoteAddress.replace(/^::ffff:/, '');

    return undefined;
  }

  private ensureJsonContentType(req: RequestLike) {
    const contentType = this.getHeader(req, 'content-type');
    const normalized = contentType?.toLowerCase();

    if (!normalized || !normalized.includes('application/json')) {
      throw new UnsupportedMediaTypeException('Only application/json payloads are accepted');
    }
  }

  private ensureOriginAllowed(req: RequestLike) {
    if (this.allowedOrigins.size === 0) return;

    const originHeader = this.getHeader(req, 'origin');
    const refererHeader = this.getHeader(req, 'referer');

    let origin: string | undefined;
    if (originHeader) {
      origin = this.normalizeOrigin(originHeader);
    } else if (refererHeader) {
      origin = this.normalizeOrigin(refererHeader);
    }

    if (!origin) {
      if (this.isProduction) {
        throw new ForbiddenException('Origin header is required');
      }
      return;
    }

    if (!this.allowedOrigins.has(origin)) {
      throw new ForbiddenException('Origin is not allowed');
    }
  }

  private getSilentDropReason(payload: FormProtectionPayload) {
    if (payload.website && payload.website.trim().length > 0) {
      return 'honeypot_filled';
    }

    const startedAtMs = Date.parse(payload.formStartedAt);
    if (Number.isNaN(startedAtMs)) {
      return 'invalid_form_started_at';
    }

    const ageMs = Date.now() - startedAtMs;
    if (ageMs < this.minSubmissionMs) {
      return 'submitted_too_fast';
    }
    if (ageMs > this.maxSubmissionMs) {
      return 'stale_submission';
    }

    return undefined;
  }
}
