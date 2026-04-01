import { Field, ObjectType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

// The `event` field is typed as GraphQLJSON because the payload is a
// discriminated union (AgentChatSubscriptionEvent from twenty-shared)
// whose variants carry different shapes:
//   - { type: 'stream-chunk', chunk: Record<string, unknown> }
//   - { type: 'message-persisted', messageId: string }
//   - { type: 'queue-updated' }
//   - { type: 'stream-error', code: string, message: string }
// Clients should cast this field to AgentChatSubscriptionEvent.
@ObjectType('AgentChatEvent')
export class AgentChatEventDTO {
  @Field(() => String)
  threadId: string;

  @Field(() => GraphQLJSON)
  event: Record<string, unknown>;
}
