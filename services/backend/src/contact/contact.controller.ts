import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactMessageDto } from './dto/contact.dto';
import { ContactService } from './contact.service';

@Controller('api')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  // Public: enqueue contact email (async)
  @Post('contact')
  @HttpCode(202)
  @Throttle({ contact: { limit: 3, ttl: 60 } })
  async contactForm(@Body() body: ContactMessageDto, @Req() req: any) {
    // Honeypot: if filled, pretend success but do not enqueue.
    if (body.website && body.website.trim().length > 0) {
      return { accepted: true };
    }

    const ip =
      (req.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req.ip;
    const userAgent = req.headers?.['user-agent'] as string | undefined;

    const { jobId } = await this.contact.enqueueContactEmail(body, { ip, userAgent });
    return { accepted: true, jobId };
  }
}
