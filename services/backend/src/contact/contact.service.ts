import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ContactMessageDto } from './dto/contact.dto';

export type ContactEmailJobData = {
  name: string;
  email: string;
  message: string;
  subject?: string;
  ip?: string;
  userAgent?: string;
  createdAtIso: string;
};

@Injectable()
export class ContactService {
  constructor(@Inject('EMAIL_QUEUE') private readonly emailQueue: Queue) {}

  async enqueueContactEmail(
    body: ContactMessageDto,
    meta: { ip?: string; userAgent?: string }
  ) {
    const data: ContactEmailJobData = {
      name: body.name,
      email: body.email,
      message: body.message,
      subject: body.subject,
      ip: meta.ip,
      userAgent: meta.userAgent,
      createdAtIso: new Date().toISOString(),
    };

    const job = await this.emailQueue.add('sendContactEmail', data, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: 1000,
      removeOnFail: 10_000,
    });

    return { jobId: job.id };
  }
}

