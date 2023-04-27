import {Construct} from 'constructs';
import {BlockPublicAccess, Bucket, ObjectOwnership} from 'aws-cdk-lib/aws-s3';
import {RemovalPolicy} from 'aws-cdk-lib';
import {Distribution, OriginAccessIdentity, ViewerProtocolPolicy} from 'aws-cdk-lib/aws-cloudfront';
import {S3Origin} from 'aws-cdk-lib/aws-cloudfront-origins';
import {BucketDeployment, Source} from 'aws-cdk-lib/aws-s3-deployment';
import { join } from "path";

export class EventCatalogWebsite extends Construct {
    private readonly _WebsiteBucket: Bucket;
    constructor(scope: Construct, id: string) {
        super(scope, id);

        this._WebsiteBucket = new Bucket(this, 'EventCatalogWebsiteBucket', {
            removalPolicy: RemovalPolicy.DESTROY,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
            autoDeleteObjects: true,
        });

        const originAccessIdentity = new OriginAccessIdentity(this, 'EventCatalogWebsiteOAI')

        this._WebsiteBucket.grantRead(originAccessIdentity);

        const distribution = new Distribution(this, 'EventCatalogWebsiteDistribution', {
            defaultRootObject: 'index.html',
            defaultBehavior: {
                origin: new S3Origin(this._WebsiteBucket, {
                    originAccessIdentity
                }),
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS
            }
        });
    }

    public get WebsiteBucket(): Bucket {
        return this._WebsiteBucket;
    }

}
