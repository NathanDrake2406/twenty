import { Logger, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { AuthGraphqlApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { EmailComposerService } from 'src/engine/core-modules/tool/tools/email-tool/email-composer.service';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { SendEmailOutputDTO } from 'src/modules/messaging/message-outbound-manager/dtos/send-email-output.dto';
import { SendEmailInput } from 'src/modules/messaging/message-outbound-manager/dtos/send-email.input';
import { MessagingMessageOutboundService } from 'src/modules/messaging/message-outbound-manager/services/messaging-message-outbound.service';

@MetadataResolver()
@UsePipes(ResolverValidationPipe)
@UseFilters(AuthGraphqlApiExceptionFilter)
@UseGuards(WorkspaceAuthGuard)
export class SendEmailResolver {
  private readonly logger = new Logger(SendEmailResolver.name);

  constructor(
    private readonly emailComposerService: EmailComposerService,
    private readonly messageOutboundService: MessagingMessageOutboundService,
  ) {}

  @Mutation(() => SendEmailOutputDTO)
  async sendEmail(
    @Args('input') input: SendEmailInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<SendEmailOutputDTO> {
    try {
      const result = await this.emailComposerService.composeEmail(
        {
          recipients: {
            to: input.to,
            cc: input.cc ?? '',
            bcc: input.bcc ?? '',
          },
          subject: input.subject,
          body: input.body,
          connectedAccountId: input.connectedAccountId,
          files: [],
          inReplyTo: input.inReplyTo,
        },
        { workspaceId: workspace.id },
      );

      if (!result.success) {
        return {
          success: false,
          error: result.output.error ?? result.output.message,
        };
      }

      const { data } = result;

      await this.messageOutboundService.sendMessage(
        {
          to: data.recipients.to,
          cc:
            data.recipients.cc.length > 0 ? data.recipients.cc : undefined,
          bcc:
            data.recipients.bcc.length > 0 ? data.recipients.bcc : undefined,
          subject: data.sanitizedSubject,
          body: data.plainTextBody,
          html: data.sanitizedHtmlBody,
          attachments: data.attachments,
          inReplyTo: data.inReplyTo,
        },
        data.connectedAccount,
      );

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }
}
