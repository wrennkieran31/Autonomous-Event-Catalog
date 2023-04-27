import {Construct} from 'constructs';
import {Pipeline} from 'aws-cdk-lib/aws-codepipeline';
import {Effect, PolicyStatement, Role, ServicePrincipal} from 'aws-cdk-lib/aws-iam';
import {CfnStateMachine, StateMachine} from 'aws-cdk-lib/aws-stepfunctions';
import {TriggerOnScheduleProps} from '../schedule/trigger-on-schedule';
import {IEventBus, Rule} from 'aws-cdk-lib/aws-events';
import {SfnStateMachine} from 'aws-cdk-lib/aws-events-targets';
export interface TriggerOnSchemaEventProps {
    pipeline: Pipeline;
    eventbus: IEventBus;
}
export class TriggerOnSchemaEvent extends Construct{
    constructor(scope: Construct, id: string, props: TriggerOnSchemaEventProps) {
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

        new Rule(this, 'EventCatalogRule', {
            eventBus: props.eventbus,
            eventPattern: {
                source: ["aws.schemas"],
                detailType: ["Schema Created", "Schema Version Created"],
            },
            targets: [new SfnStateMachine(StateMachine.fromStateMachineArn(this, 'StateMachine', stateMachine.attrArn))],
        });
    }
}
