import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FormProtectionService } from '../common/form-protection.service';
import { ContactMessageDto } from './dto/contact.dto';
import { ContactService } from './contact.service';

@Controller('api')
export class ContactController {
  constructor(
    private readonly contact: ContactService,
    private readonly formProtection: FormProtectionService
  ) {}

  // Public: enqueue contact email (async)
  @Post('contact')
  @HttpCode(202)
  @Throttle({ contact: { limit: 3, ttl: 60 } })
  async contactForm(@Body() body: ContactMessageDto, @Req() req: any) {
    const securityResult = await this.formProtection.evaluateSubmission(body, req, 'contact form');
    if (securityResult.shouldDropSilently) {
      return { accepted: true };
    }

    const { jobId } = await this.contact.enqueueContactEmail(body, {
      ip: securityResult.ip,
      userAgent: securityResult.userAgent,
    });
    return { accepted: true, jobId };
  }
}
