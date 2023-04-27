import {Construct} from 'constructs';
import {Rule, Schedule} from 'aws-cdk-lib/aws-events';
import {CfnStateMachine, StateMachine} from 'aws-cdk-lib/aws-stepfunctions';
import {Pipeline} from 'aws-cdk-lib/aws-codepipeline';
import {Effect, PolicyStatement, Role, ServicePrincipal} from 'aws-cdk-lib/aws-iam';
import {SfnStateMachine} from 'aws-cdk-lib/aws-events-targets';
import {CfnResource} from 'aws-cdk-lib';
export interface TriggerOnScheduleProps {
    scheduleExpression: string;
    pipeline: Pipeline;
}

export class TriggerOnSchedule extends Construct {
    constructor(scope: Construct, id: string, props: TriggerOnScheduleProps) {
        super(scope, id);
        const asl = `{
                      "Comment": "A description of my state machine",
                      "StartAt": "StartPipelineExecution",
                      "States": {
                        "StartPipelineExecution": {
                          "Type": "Task",
                          "End": true,
                          "Parameters": {
                            "Name": "EventCatalogPipeline"
                          },
                          "Resource": "arn:aws:states:::aws-sdk:codepipeline:startPipelineExecution"
                        }
                      }
                    }`
        const sfnRole = new Role(this, 'Step-Function-Role', {
            assumedBy: new ServicePrincipal('states.amazonaws.com'),
            roleName: 'EventCatalogPipelineStepFunctionRole',
        })
        sfnRole.addToPolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'codepipeline:StartPipelineExecution'
            ],
            resources: [
                // Replace with your CodePipeline ARN
                props.pipeline.pipelineArn
            ]
        }))
        const stateMachine = new CfnStateMachine(this, 'EventCatalogStateMachine', {
            definitionString: asl,
            roleArn: sfnRole.roleArn,
            stateMachineType: 'EXPRESS',
        })
        const schedulerRole = new Role(this, 'SchedulerRole', {
            assumedBy: new ServicePrincipal('scheduler.amazonaws.com'),
        });
        schedulerRole.addToPolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['states:StartExecution'],
            resources: [stateMachine.attrArn],
        }));
        const eventCatalogScheduler = new CfnResource(this, "eventCatalogScheduler", {
            type: "AWS::Scheduler::Schedule",
            properties: {
                Name: "EventCatalogSchedule",
                Description: "Runs the step function every weekday at midnight",
                FlexibleTimeWindow: {Mode: "OFF"},
                ScheduleExpression: props.scheduleExpression,
                ScheduleExpressionTimezone: "UTC",
                Target: {
                    Arn: stateMachine.attrArn,
                    RoleArn: schedulerRole.roleArn,
                },
            },
        });
    }
}
