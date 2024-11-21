Managing Multiple AWS Accounts with Terraform

When managing resources in multiple AWS accounts you need to know how you want to manage your state files. This will determine which approach is viable for managing multiple AWS accounts with Terraform.

If you’re happy to have a single state file in a central account containing all resources for all other accounts then life is easy. You can create multiple providers with separate account details along with a unique alias. You can then reference this provider with the provider argument when creating resources.

#The dev account provider configuration
provider "aws" {
alias = "dev"
...
}

#The test account provider configuration
provider "aws" {
alias = "test"
...
}

resource "aws_instance" "foo" {
provider = aws.dev
...
}

However when managing multiple AWS accounts, especially when one of them contains a production workload. You may prefer having each state file separate. In order to achieve this we need complete some prerequisites in each AWS account.

    S3 Bucket for the backend, something like project-<envname> we can then parameterise the envname within the project pipeline to ensure each account initialises terraform with no issues.
    Dynamo DB table for state locking. This is of course optional but creating a table with the same name in each account simplifies life.

We can use the -backend-config argument when calling terraform init to pass in the correct bucket name for the specified environment.

terraform init -backend-config="bucket=project-<envname>"

This results in us being able to deploy the exact same terraform code to multiple AWS accounts whilst using separate state files.

We could use various mechanisms to handle the AWS account switching and authentication such as Terraform workspaces and AWS profiles. You could link the workspace names to the AWS profiles and use the terraform.workspace. Swapping workspaces then would also swap the AWS profile used to deploy.

provider "aws" {
region = "eu-west-1"
profile = terraform.workspace
}

However it makes more sense to move this process outside of Terraform itself. The AWS account being deployed to should be determined as part of the pipeline. Whether it’s a parameter being passed into the pipeline itself, or if a commit to master initially deploys to Dev and then propagates through all environments on its route to live.

Moving this up into the pipeline itself also frees us up to use multiple workspaces within a single AWS account. This greatly simplifies the ability to complete blue/green deployments with Terraform. It also allows us to simplify our state file management within larger projects. Workspace usage would depend entirely on the project structure. We might want to use a global workspace for shared resources among sub environments and a workspace for each sub environment.
