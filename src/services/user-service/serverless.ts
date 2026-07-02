import 'tsconfig-paths/register';
import Aws, { Serverless } from 'serverless/aws';
import { INVOKE_SUM_RESOLVER_FN, SERVERLESS_SERVICE_NAME } from "@constants/service.const"

module.exports = {
    service: SERVERLESS_SERVICE_NAME,
    frameworkVersion: '3',

    package: {
        individually: true,
        excludeDevDependencies: true,
    } as Aws.Package,

    custom: {
      esbuild: {
          bundle: true,
          minify: true,
          platform: "node",
          tsconfig: './tsconfig.json',
      }
    } as Aws.Custom,

    provider: {
        name: "aws",
        runtime: "nodejs20.x",
        region: "eu-central-1",
        stage: "dev",

        apiGateway: {
           shouldStartNameWithService: true,
        }
    } as Aws.Provider,

    plugins: [
      "serverless-esbuild",
    ],

    functions: {
        auth: {
          handler: 'src/authorizer.handler',
        },

        apiUserLogin: {
            handler: 'src/user-service/handlers/api/user/login.handler',
            events: [
                {
                    http: {
                        method: "GET",
                        path: "/",
                        authorizer: {
                            name: "auth",
                            type: "request",
                        }
                    },
                }
            ]
        },

        [INVOKE_SUM_RESOLVER_FN]: {
            handler: 'src/user-service/handlers/resolvers/sum.resolver.handler',
        },
    }
} as Serverless;