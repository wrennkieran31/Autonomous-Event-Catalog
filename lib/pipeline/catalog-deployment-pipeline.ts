import {Construct} from 'constructs';
import {Artifact, Pipeline} from 'aws-cdk-lib/aws-codepipeline';
import {CodeBuildAction, S3DeployAction, S3SourceAction, S3Trigger} from 'aws-cdk-lib/aws-codepipeline-actions';
import {BlockPublicAccess, Bucket, ObjectOwnership} from 'aws-cdk-lib/aws-s3';
import {BuildSpec, LinuxBuildImage, Project} from 'aws-cdk-lib/aws-codebuild';
import {PolicyStatement} from 'aws-cdk-lib/aws-iam';
import {BucketDeployment, Source} from 'aws-cdk-lib/aws-s3-deployment';
import {join} from 'path';
import {RemovalPolicy, Size} from 'aws-cdk-lib';

export interface CatalogDeploymentPipelineProps {
    websiteBucket: Bucket;
}

export class CatalogDeploymentPipeline extends Construct{
    private readonly pipeline: Pipeline;
    constructor(scope: Construct, id: string, props: CatalogDeploymentPipelineProps){
        super(scope, id);
        const sourceOutput = new Artifact();
        const sourceAction = new S3SourceAction({
            actionName: 'EventCatalogS3Source',
            bucket: Bucket.fromBucketName(this, 'EventCatalogSourceBucket', 'dev-kieran-bucket'),
            bucketKey: 'catalog.zip',
            output: sourceOutput,
            trigger: S3Trigger.NONE // Manual Trigger
        });
        const buildProject = new Project(this, 'EventCatalogBuildProject', {
            environment: {
                buildImage: LinuxBuildImage.AMAZON_LINUX_2_4,
            },
            buildSpec: BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        commands: [
                            'npm ci', // install dependencies
                        ]
                    },
                    build: {
                        commands: [
                            'npm run generate',
                            'npm run build', // build the website

                        ]
                    },
                },
                artifacts: {
                    files: [
                        '**/*'
                    ],
                    'base-directory': 'out'
                }
            })
        });
        buildProject.addToRolePolicy((new PolicyStatement({
            actions: [
                's3:*',
                "events:DescribeRule",
                "events:DescribeEventBus",
                "events:DescribeEventSource",
                "events:ListRuleNamesByTarget",
                "events:ListRules",
                "events:ListTargetsByRule",
                "schemas:ExportSchema",
                "schemas:SearchSchemas",
                "schemas:ListSchemas",
                "schemas:ListSchemaVersions",
                "schemas:DescribeSchema",
                "schemas:GetDiscoveredSchema"
            ],
            resources: ["*"],
        })));

        const buildOutput = new Artifact();
        const buildAction = new CodeBuildAction({
            actionName: 'EventCatalogCodeBuild',
            project: buildProject,
            input: sourceOutput,
            outputs: [buildOutput],
        });
        const deployAction = new S3DeployAction({
            actionName: 'EventCatalogS3Deploy',
            input: buildOutput,
            bucket: props.websiteBucket,
            extract: true
        })
        this.pipeline = new Pipeline(this, 'EventCatalogPipeline', {
            pipelineName: 'EventCatalogPipeline',
            stages: [
                {
                    stageName: 'Source',
                    actions: [sourceAction],
                },
                {
                    stageName: 'Build',
                    actions: [buildAction],
                },
                {
                    stageName: 'Deploy',
                    actions: [deployAction],
                }
            ]
        });
        this.pipeline.addToRolePolicy(new PolicyStatement({
            actions: ['s3:*'],
            resources: ['*']
        }));
    }

    public get Pipeline(): Pipeline {
        return this.pipeline;
    }
}
