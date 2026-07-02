# Serverless TypeScript Boilerplate

> A clean AWS Lambda starter for building small, typed, service-oriented APIs with Serverless Framework, TypeScript, esbuild, request authorization, and Lambda-to-Lambda resolver calls.

![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Serverless](https://img.shields.io/badge/Serverless-3.x-fd5750?style=flat-square&logo=serverless&logoColor=white)
![AWS Lambda](https://img.shields.io/badge/AWS%20Lambda-nodejs20.x-ff9900?style=flat-square&logo=awslambda&logoColor=white)
![esbuild](https://img.shields.io/badge/esbuild-bundled-ffcf00?style=flat-square&logo=esbuild&logoColor=black)

## What This Gives You

This boilerplate is designed for fast-moving serverless projects that still need structure from day one.

- **TypeScript-first Lambda handlers** with typed request and response boundaries.
- **Serverless Framework v3** configuration written in TypeScript.
- **esbuild bundling** for small, fast Lambda artifacts.
- **API Gateway request authorizer** with JWT verification.
- **Reusable handler wrapper** that merges path params, query params, and JSON body into a single `data` object.
- **Lambda resolver pattern** for splitting API-facing handlers from internal business operations.
- **Local resolver execution** through `sls invoke local` when `NODE_ENV=dev`.
- **AWS Lambda invocation** for production resolver calls through `@aws-sdk/client-lambda`.
- **Typed AWS helpers** for SQS, SNS, and DynamoDB operations.
- **Typed SQS/SNS handlers** with local producer-to-consumer dispatch.
- **Dotenv-powered configuration** through `.env` and `serverless-dotenv-plugin`.
- **Path aliases** for cleaner imports such as `@lib/*` and `@constants/*`.

## Architecture

```mermaid
flowchart LR
    client[Client] --> gateway[API Gateway]
    gateway --> auth[Request Authorizer]
    auth --> api[apiUserLogin Lambda]
    api --> invoker[invokeSum helper]
    invoker --> resolver[invokeSumResolver Lambda]
    resolver --> api
    api --> client
```

The API handler stays thin: it receives normalized request data, reads authenticated context, and delegates internal work to a resolver Lambda.

## Project Structure

```text
.
├── src
│   ├── authorizer.ts
│   ├── constants
│   │   └── service.const.ts
│   ├── libs
│   │   ├── aws-client-config.lib.ts
│   │   ├── dynamodb.lib.ts
│   │   ├── invoke-function.lib.ts
│   │   ├── lambda-handler.lib.ts
│   │   ├── serverless-local.lib.ts
│   │   ├── sns-handler.lib.ts
│   │   ├── sns.lib.ts
│   │   ├── sqs-handler.lib.ts
│   │   └── sqs.lib.ts
│   └── services
│       ├── sls.defaults.ts
│       └── user-service
│           ├── __test
│           │   ├── event.json
│           │   ├── publish-sns-event.json
│           │   ├── send-sqs-event.json
│           │   ├── sns-event.json
│           │   └── sqs-event.json
│           ├── __sls
│           │   ├── consts.ts
│           │   ├── queues.ts
│           │   ├── resources.ts
│           │   ├── roles.ts
│           │   ├── tables.ts
│           │   └── topics.ts
│           ├── handlers
│           │   ├── api
│           │   │   ├── test
│           │   │   │   ├── publish-sns.ts
│           │   │   │   └── publish-sqs.ts
│           │   │   └── user
│           │   │       └── login.ts
│           │   ├── events
│           │   │   ├── sns
│           │   │   │   └── user-events.ts
│           │   │   └── sqs
│           │   │       └── user-events.ts
│           │   ├── invokers
│           │   │   └── sum.invoker.ts
│           │   └── resolvers
│           │       └── sum.resolver.ts
│           ├── interfaces
│           ├── serverless.ts
│           └── types
├── .env.example
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── yarn.lock
```

## Requirements

- Node.js 20+
- Yarn
- AWS credentials configured locally for deploys
- Serverless Framework dependencies installed from this project

## Quick Start

Install dependencies:

```bash
yarn install
```

Create local environment variables:

```bash
cp .env.example .env
```

This workspace already includes a local `.env` with LocalStack-friendly AWS values. Serverless loads it through `serverless-dotenv-plugin`, and the AWS helper clients also load it directly for local code paths.

Serverless commands can be run from the project root through package scripts. The scripts use `pushd` internally to execute Serverless from the `user-service` directory.

Invoke the sample resolver locally:

```bash
yarn sls:user-service invoke local \
  --function invokeSumResolver \
  --data '{"a":10,"b":25}'
```

Invoke the API handler with the sample event:

```bash
yarn sls:user-service invoke local \
  --function apiUserLogin \
  --path __test/event.json
```

## Scripts

| Script | Description |
| --- | --- |
| `yarn local:aws:up` | Start LocalStack services. Cloud resources are defined by Serverless. |
| `yarn local:aws:down` | Stop the local AWS stack. |
| `yarn local:aws:logs` | Follow LocalStack logs. |
| `yarn sls:user-service <command>` | Run any Serverless command inside `src/services/user-service`. |
| `yarn sls:user-service:print` | Print the compiled Serverless config. |
| `yarn sls:user-service:deploy` | Deploy the user service. |
| `yarn sls:user-service:remove` | Remove the user service stack. |
| `yarn sls:user-service:invoke` | Run `sls invoke local` for the user service. |

## Dotenv

Environment variables live in `.env`. The committed `.env.example` documents every required key.

The Serverless service uses `serverless-dotenv-plugin` with `path: ../../../.env`, because the service config lives in `src/services/user-service`. `src/services/sls.defaults.ts` also loads the same `.env` before building resources and IAM statements. Shared AWS helpers load the root `.env` before creating SDK clients.

## Infrastructure Resources

DynamoDB tables are declared in each service under `__sls/tables.ts`, queues under `__sls/queues.ts`, topics under `__sls/topics.ts`, IAM permissions under `__sls/roles.ts`, and `__sls/resources.ts` exports `Resources` and `Outputs` for the service config.

The shared `src/services/sls.defaults.ts` file owns common Serverless defaults through `SLS.serverless` (`frameworkVersion`, package settings, `custom`, base `provider`, and plugins). It also exposes `createDDB`, `createSQS`, `createSNS`, `genApiEndpoint`, ARN builders, and IAM statement flattening, so service configs stay small and consistent:

```ts
import Aws from 'serverless/aws';
import * as SLS from '../../sls.defaults';
import { USERS_TABLE } from './consts';

const tables = {
    Resources: {
        ...SLS.createDDB({
            name: USERS_TABLE,
            key: [
                { AttributeName: 'pk', KeyType: 'HASH' },
            ],
        }),
    },
} as Aws.Resources;

export default tables;
```

```ts
import * as SLS from '../../sls.defaults';
import { USERS_TABLE } from './consts';

export default SLS.createIamRoleStatements({
    userStore: {
        read: {
            Effect: 'Allow',
            Action: ['dynamodb:GetItem', 'dynamodb:Query'],
            Resource: [
                SLS.makeDBArn(USERS_TABLE),
                SLS.makeDBArn(USERS_TABLE, 'index/*'),
            ],
        },
    },
} satisfies SLS.IamRoleStatementGroup);
```

## Local AWS

Start local SQS, SNS, and DynamoDB:

```bash
yarn local:aws:up
```

When `NODE_ENV=dev`, the AWS helpers automatically use LocalStack at `http://localhost:4566` with local credentials. You can override that endpoint with `LOCAL_AWS_ENDPOINT`.

The sample queue, topic, and table are Serverless resources composed through `resources: { Resources: { ...Resources }, Outputs }` in `src/services/user-service/serverless.ts`. LocalStack only provides local AWS-compatible endpoints; it does not bootstrap resources through shell scripts.

`SSMAuthServiceDomain` is generated with `SLS.genApiEndpoint('auth')` and stores the deployed API Gateway endpoint in SSM Parameter Store.

In local mode, `getSQS` accepts either a full queue URL or a queue name, and `getSNS` accepts either a full topic ARN or a topic name.

Local producer-to-consumer dispatch is controlled by `.env` maps:

```bash
LOCAL_SQS_EVENT_HANDLERS=user-events=testHandleQueueMessage
LOCAL_SNS_EVENT_HANDLERS=user-events=testHandleTopicMessage
```

That means `testSendQueueMessage` sends to the local SQS queue and then immediately invokes `testHandleQueueMessage` with a generated `SQSEvent`. `testPublishTopicMessage` does the same for SNS.

Run local smoke tests:

```bash
yarn sls:user-service:invoke \
  --function testSendQueueMessage \
  --path __test/send-sqs-event.json

yarn sls:user-service:invoke \
  --function testPublishTopicMessage \
  --path __test/publish-sns-event.json

yarn sls:user-service:invoke \
  --function testHandleQueueMessage \
  --path __test/sqs-event.json

yarn sls:user-service:invoke \
  --function testHandleTopicMessage \
  --path __test/sns-event.json

yarn sls:user-service:invoke \
  --function apiUserLogin \
  --path __test/event.json
```

`apiUserLogin` writes a login item into `USERS_TABLE_NAME` and reads it back before responding.

## Deploy

Deploy the user service:

```bash
yarn sls:user-service deploy \
  --stage dev \
  --region eu-central-1
```

Remove the deployed stack:

```bash
yarn sls:user-service remove \
  --stage dev \
  --region eu-central-1
```

## Environment Variables

| Variable | Required | Used By | Description |
| --- | --- | --- | --- |
| `JWT_SECRET` | Yes | `src/authorizer.ts` | Secret used to verify bearer JWTs. |
| `NODE_ENV` | Local only | `src/libs/*` | Set to `dev` to use local Lambda resolver invocation and LocalStack-backed AWS clients. |
| `STAGE` | Optional | `src/services/user-service/serverless.ts` | Serverless stage. Defaults to `dev`. |
| `AWS_REGION` | AWS/runtime | AWS SDK clients | Region used by AWS clients. |
| `AWS_DEFAULT_REGION` | Local optional | Docker and AWS-compatible tools | Default region used by local AWS tooling. |
| `AWS_ACCOUNT_ID` | Local optional | `src/libs/aws-client-config.lib.ts` | Account id used to build local SQS URLs and SNS ARNs. Defaults to `000000000000`. |
| `AWS_ACCESS_KEY_ID` | Local optional | AWS SDK clients | LocalStack access key. Defaults to `test` in dev. |
| `AWS_SECRET_ACCESS_KEY` | Local optional | AWS SDK clients | LocalStack secret key. Defaults to `test` in dev. |
| `LOCAL_AWS_ENDPOINT` | Local optional | `src/libs/aws-client-config.lib.ts` | Shared LocalStack endpoint. Defaults to `http://localhost:4566`. |
| `SQS_ENDPOINT` | Optional | `src/libs/sqs.lib.ts` | Custom SQS-compatible endpoint. Overrides `LOCAL_AWS_ENDPOINT` for SQS. |
| `SNS_ENDPOINT` | Optional | `src/libs/sns.lib.ts` | Custom SNS-compatible endpoint. Overrides `LOCAL_AWS_ENDPOINT` for SNS. |
| `DYNAMODB_ENDPOINT` | Optional | `src/libs/dynamodb.lib.ts` | Custom DynamoDB-compatible endpoint. Overrides `LOCAL_AWS_ENDPOINT` for DynamoDB. |
| `DRY_RUN` | Optional | SQS and SNS publishers | Set to `true` or `1` to skip batch publishing. |
| `USER_EVENTS_QUEUE_NAME` | Example | SQS examples | Local queue name. |
| `USER_EVENTS_QUEUE_URL` | Example | SQS examples | Full local queue URL. |
| `USER_EVENTS_QUEUE_ARN` | Example | SQS examples | Full local queue ARN. |
| `USER_EVENTS_TOPIC_NAME` | Example | SNS examples | Local topic name. |
| `USER_EVENTS_TOPIC_ARN` | Example | SNS examples | Full local topic ARN. |
| `USERS_TABLE_NAME` | Example | DynamoDB examples and `src/services/user-service/__sls/tables.ts` | DynamoDB table name. |
| `LOCAL_SQS_EVENT_HANDLERS` | Local optional | `src/libs/sqs.lib.ts` | Comma-separated `queueName=functionName` map for local SQS dispatch. |
| `LOCAL_SNS_EVENT_HANDLERS` | Local optional | `src/libs/sns.lib.ts` | Comma-separated `topicName=functionName` map for local SNS dispatch. |

## AWS Helpers

Publish SQS events:

```ts
import { sendMessage } from '@lib/sqs.lib';

await sendMessage(
    process.env.USER_EVENTS_QUEUE_URL!,
    {
        userId: 'user-id',
    },
);
```

Publish SNS events:

```ts
import { publishSNS } from '@lib/sns.lib';

await publishSNS(
    process.env.USER_EVENTS_TOPIC_ARN!,
    {
        userId: 'user-id',
    },
);
```

`sendMessage` and `publishSNS` publish one JSON payload to the provided queue or topic and still dispatch local handlers in dev mode. `sendBatchMessage` remains available for SQS batch publishing and chunks messages into AWS requests of 10 records.

Use DynamoDB with native JavaScript objects and `dynoexpr` builders:

```ts
import { getDB } from '@lib/dynamodb.lib';

const db = getDB(process.env.USERS_TABLE_NAME!);

await db.put({
    pk: 'user-id',
    email: 'user@example.com',
}, {
    Condition: {
        pk: 'attribute_not_exists',
    },
});

const user = await db.get({
    pk: 'user-id',
}, {
    Projection: ['pk', 'email'],
});

await db.update({
    pk: 'user-id',
}, {
    Update: {
        loginCount: 'loginCount + 1',
    },
});
```

Create an SQS consumer:

```ts
import { sqsHandler } from '@lib/sqs-handler.lib';

export const handler = sqsHandler<{ event: string }>(async ({ data, messageId }) => {
    console.info('received sqs message', {
        data,
        messageId,
    });
});
```

Create an SNS consumer:

```ts
import { snsHandler } from '@lib/sns-handler.lib';

export const handler = snsHandler<{ event: string }>(async ({ data, messageId }) => {
    console.info('received sns message', {
        data,
        messageId,
    });
});
```

## Request Flow

1. API Gateway receives the request.
2. The request authorizer reads `Authorization: Bearer <token>`.
3. A valid JWT adds `userId` to the Lambda authorizer context.
4. `lambdaHandler` normalizes request input into `{ data, ctx }`.
5. The API handler calls a typed invoker.
6. The invoker calls a resolver locally in development or through AWS Lambda in deployed environments.
7. The handler returns a JSON API Gateway response.

## Adding A New Resolver

1. Add request and response types in `src/services/<service>/types`.
2. Create a resolver in `src/services/<service>/handlers/resolvers`.
3. Create an invoker in `src/services/<service>/handlers/invokers`.
4. Register the resolver in the service `serverless.ts`.
5. Call the invoker from an API handler or another resolver.

Example naming pattern:

```text
handlers/resolvers/create-user.resolver.ts
handlers/invokers/create-user.invoker.ts
functions.createUserResolver
invokeCreateUser(...)
```

## Core Conventions

- Keep API handlers focused on transport concerns.
- Put business operations behind resolver Lambdas.
- Keep shared Lambda utilities in `src/libs`.
- Keep common Serverless defaults in `src/services/sls.defaults.ts`.
- Keep service infrastructure resources and IAM permissions in `src/services/<service>/__sls`.
- Keep stack and function names in `src/constants/service.const.ts`.
- Use path aliases for stable imports instead of long relative paths.
- Keep local test payloads in each service-local `__test` directory.

## Production Checklist

- Store `JWT_SECRET` in a secure environment variable or secret manager.
- Add least-privilege IAM permissions for Lambda-to-Lambda invocation.
- Configure per-stage values for region, environment, and stack names.
- Add CI checks for TypeScript compilation and Serverless packaging.
- Add structured logging and error reporting before handling production traffic.

## Troubleshooting

**`Service configuration is expected to be placed in a root of a service`**

Use `yarn sls:user-service <command>` from the project root, or run Serverless directly from `src/services/user-service`.

**`Compilation failed for function alias`**

Serverless handler paths are resolved relative to the service directory. Check that every `functions.*.handler` value in `serverless.ts` points to a real file from `src/services/user-service`.

## License

MIT Leroy Anders
