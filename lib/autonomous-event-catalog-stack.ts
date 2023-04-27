import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {EventCatalogWebsite} from './website/event-catalog-website';
import {CatalogDeploymentPipeline} from './pipeline/catalog-deployment-pipeline';
import {TriggerOnSchedule} from './trigger/schedule/trigger-on-schedule';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AutonomousEventCatalogStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const website = new EventCatalogWebsite(this, 'EventCatalogWebsite');
    const deploymentPipeline = new CatalogDeploymentPipeline(this, 'CatalogDeploymentPipeline', {
        websiteBucket: website.WebsiteBucket
    })
    new TriggerOnSchedule(this, 'TriggerOnSchedule', {
      pipeline: deploymentPipeline.Pipeline,
      scheduleExpression: `cron(1 0 ? * MON-FRI *)`
    })
  }
}
