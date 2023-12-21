import { TypeDefinition, decoded, definitionDsdl, encoded } from "./definition";
import { dsdlSignature } from "./signature";
import { DefinitionType } from "./definition";
import { Any, Find, Index } from "./util";

export type Schema = {
  messages: readonly MessageDefinition<Any, Any, Any>[];
  services: readonly ServiceDefinition<Any, Any, Any, Any>[];
};

type Messages<S extends Schema> = S["messages"];
type Services<S extends Schema> = S["services"];
export type MessageType<S extends Schema> = Messages<S>[number]["type"];
export type ServiceType<S extends Schema> = Services<S>[number]["type"];
export type MessageId<S extends Schema> = Messages<S>[number]["id"];
export type ServiceId<S extends Schema> = Services<S>[number]["id"];
type MessageTypeDefinition<S extends Schema> =
  Messages<S>[number]["definition"];
type ServiceRequestDefinition<S extends Schema> =
  Services<S>[number]["request"];
type ServiceResponseDefinition<S extends Schema> =
  Services<S>[number]["response"];

export type Message<
  S extends Schema,
  Type extends MessageType<S>
> = DefinitionType<
  Index<Index<Find<Messages<S>, "type", Type>, Type>, "definition">
>;

export type ServiceRequest<
  S extends Schema,
  Type extends ServiceType<S>
> = DefinitionType<
  Index<Index<Find<Services<S>, "type", Type>, Type>, "request">
>;

export type ServiceResponse<
  S extends Schema,
  Type extends ServiceType<S>
> = DefinitionType<
  Index<Index<Find<Services<S>, "type", Type>, Type>, "response">
>;

export const messageFromType = <S extends Schema>(
  { messages }: S,
  type: MessageType<S>
) =>
  messages.find(
    (
      _
    ): _ is MessageDefinition<
      MessageId<S>,
      MessageType<S>,
      MessageTypeDefinition<S>
    > => _.type === type
  )!;

export const serviceFromType = <S extends Schema>(
  { services }: S,
  type: ServiceType<S>
) =>
  services.find(
    (
      _
    ): _ is ServiceDefinition<
      ServiceId<S>,
      ServiceType<S>,
      ServiceRequestDefinition<S>,
      ServiceResponseDefinition<S>
    > => _.type === type
  )!;

export const messageTypeFromId = <S extends Schema>(
  { messages }: S,
  id: number
) => messages.find((_) => _.id === id)?.type;

export const serviceTypeFromId = <S extends Schema>(
  { services }: S,
  id: number
) => services.find((_) => _.id === id)?.type;

export const messageDefinition = <
  S extends Schema,
  Type extends MessageType<S>
>(
  schema: S,
  type: Type
) => messageFromType(schema, type).definition;

export const requestDefinition = <
  S extends Schema,
  Type extends ServiceType<S>
>(
  schema: S,
  type: Type
) => serviceFromType(schema, type).request;

export const responseDefinition = <
  S extends Schema,
  Type extends ServiceType<S>
>(
  schema: S,
  type: Type
) => serviceFromType(schema, type).response;

export const decodeMessage = <S extends Schema, Type extends MessageType<S>>(
  schema: S,
  type: Type,
  data: Uint8Array
) => decoded(messageDefinition(schema, type), data);

export const encodeMessage = <S extends Schema, Type extends MessageType<S>>(
  schema: S,
  type: Type,
  message: Message<S, Type>
) => encoded(messageDefinition(schema, type), message);

export const decodeRequest = <S extends Schema, Type extends ServiceType<S>>(
  schema: S,
  type: Type,
  payload: Uint8Array
) => decoded(requestDefinition(schema, type), payload);

export const encodeRequest = <S extends Schema, Type extends ServiceType<S>>(
  schema: S,
  type: Type,
  request: ServiceRequest<S, Type>
) => encoded(requestDefinition(schema, type), request);

export const decodeResponse = <S extends Schema, Type extends ServiceType<S>>(
  schema: S,
  type: Type,
  payload: Uint8Array
) => decoded(responseDefinition(schema, type), payload);

export const encodeResponse = <S extends Schema, Type extends ServiceType<S>>(
  schema: S,
  type: Type,
  response: ServiceResponse<S, Type>
) => encoded(responseDefinition(schema, type), response);

export type MessageDefinition<
  Id extends number | undefined,
  Type extends string,
  Definition extends TypeDefinition
> = {
  id?: Id;
  type: Type;
  definition: Definition;
  dsdl: string;
  signature: bigint;
  maximumBits: number;
};

export const message = <
  Id extends number | undefined,
  Type extends string,
  Definition extends TypeDefinition
>({
  id,
  type,
  definition,
}: {
  id?: Id;
  type: Type;
  definition: Definition;
}) => {
  const fieldSignatures = Object.values(definition)
    .map((_) => _.signature)
    .filter((_): _ is bigint => !!_);
  const maximumBits = Object.values(definition)
    .map((_) => _.maximumBits)
    .reduce((a, b) => a + b, 0);
  const dsdl = [type, definitionDsdl(definition)].filter((_) => !!_).join("\n");
  const signature = dsdlSignature(dsdl, fieldSignatures);
  return {
    id,
    type,
    definition,
    dsdl,
    signature,
    maximumBits,
  } satisfies MessageDefinition<Id, Type, Definition>;
};

export type ServiceDefinition<
  Id extends number,
  Type extends string,
  Request extends TypeDefinition,
  Response extends TypeDefinition
> = {
  id: Id;
  type: Type;
  request: Request;
  response: Response;
  dsdl: string;
  signature: bigint;
};

export const service = <
  Id extends number,
  Type extends string,
  Request extends TypeDefinition,
  Response extends TypeDefinition
>({
  type,
  id,
  request,
  response,
}: {
  type: Type;
  id: Id;
  request: Request;
  response: Response;
}) => {
  const fieldSignatures = [
    ...Object.values(request).map((_) => _.signature),
    ...Object.values(response).map((_) => _.signature),
  ].filter((_): _ is bigint => !!_);
  const dsdl = [type, definitionDsdl(request), "---", definitionDsdl(response)]
    .filter((_) => !!_)
    .join("\n");
  const signature = dsdlSignature(dsdl, fieldSignatures);
  return {
    type,
    id,
    request,
    response,
    dsdl,
    signature,
  } satisfies ServiceDefinition<Id, Type, Request, Response>;
};

export const collectSignatures = <S extends Schema>({
  messages,
  services,
}: S) => {
  return [...messages, ...services]
    .map(({ id, signature }) => [id ?? 0, signature] as const)
    .reduce<{ [id: number]: bigint }>((acc, [id, signature]) => {
      acc[id] = signature;
      return acc;
    }, {});
};
