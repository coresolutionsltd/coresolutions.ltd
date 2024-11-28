---
title: "Managing Multiple AWS Accounts with Terraform"
description: "Manage multiple AWS accounts with Terraform, from super simple to leveraging AWS Control Tower AFT."
pubDate: 2020-01-01
author: "Billy"
cardImage: "@/images/blog/multiple-aws-accounts.jpg"
cardImageAlt: "Managing Multiple AWS Accounts with Terraform"
readTime: 2
tags: ["terraform", "aws"]
---

When working with multiple AWS accounts, it's crucial to decide how you'll manage your Terraform state files. This choice influences the approach you take for deploying and managing resources across these accounts. In this post, we'll explore best practices for managing multiple AWS accounts with Terraform, including leveraging AWS Organisations and AWS Control Tower Account Factory for Terraform (AFT) for streamlined account vending.

## Single State File Approach

If you're comfortable having a single state file in a central account that contains all resources for all other accounts, the process is super straightforward. You can create multiple providers within your Terraform configuration, each with separate account credentials and a unique alias. Then, reference the appropriate provider using the `provider` argument when creating resources.

For example:

```
# Provider configuration for the dev account
provider "aws" {
  alias = "dev"
  ...
}

# Provider configuration for the test account
provider "aws" {
  alias = "test"
  ...
}

# Resource creation in the dev account
resource "aws_instance" "example" {
  provider = aws.dev
  ...
}
```

This method allows you to manage resources across multiple AWS accounts within a single Terraform configuration and state file.

## Separate State Files for Each Account

When dealing with multiple AWS accounts—especially when one includes production workloads—you might prefer to maintain separate state files for each account. This enhances security and reduces the risk of accidental changes affecting production resources.

### Prerequisites

To achieve this separation, you'll need to set up the following in each AWS account:

1. **S3 Bucket for Backend Storage**: Create a bucket named something like `project-<envname>`. You can parameterise `<envname>` within your deployment pipeline to ensure Terraform initialises correctly in each account.

2. **DynamoDB Table for State Locking**: Although optional, using a DynamoDB table with the same name in each account simplifies state locking and ensures consistency.

### Initialising Terraform with Separate Backends

You can use the `-backend-config` argument when running `terraform init` to specify the correct S3 bucket for each environment:

```
terraform init -backend-config="bucket=project-<envname>"
```

This approach allows you to deploy the same Terraform code to multiple AWS accounts while maintaining separate state files for each.

## Managing AWS Account Authentication

There are several mechanisms to handle AWS account switching and authentication in Terraform:

### AWS Profiles

You can use AWS CLI profiles to manage credentials for different accounts. By specifying the `profile` argument in your provider configuration, Terraform will use the corresponding AWS credentials.

```
provider "aws" {
  region  = "eu-west-1"
  profile = var.aws_profile
}
```

You can pass the `aws_profile` variable through your pipeline or environment variables, aligning the deployment with the target AWS account.

### Terraform Workspaces

Terraform workspaces can also help manage multiple environments. By linking workspace names to AWS profiles, switching workspaces can automatically switch the AWS account used for deployment.

```
provider "aws" {
  region  = "eu-west-1"
  profile = terraform.workspace
}
```

However, it's often better to handle account selection outside of Terraform. This approach keeps Terraform configurations cleaner and allows for more flexible workspace usage within individual accounts.

## Leveraging AWS Organisations and AFT

### AWS Organisations

AWS Organisations allows you to manage multiple AWS accounts centrally. By organising accounts into organisational units (OUs), you can apply policies, manage permissions, and simplify billing.

Integrating AWS Organisations with Terraform involves:

- **Using the `aws_organizations` provider**: Manage organisational units, accounts, and policies as code.
- **Centralising IAM Roles**: Create cross-account IAM roles that Terraform can assume to manage resources in member accounts.

### AWS Control Tower Account Factory for Terraform (AFT)

AWS Control Tower AFT automates the provisioning and management of AWS accounts in Control Tower. It provides a scalable and consistent way to vend new accounts with predefined configurations.

#### Benefits of Using AFT

- **Automated Account Vending**: Streamlines the creation of new AWS accounts with standardised settings.
- **Infrastructure as Code**: Manages account configurations and resources using Terraform.
- **Compliance and Governance**: Ensures new accounts adhere to organisational policies and best practices.

#### High-Level Workflow

1. **Set Up Control Tower**: Ensure AWS Control Tower is configured in your management account.

2. **Deploy AFT**: Use the AFT module to set up the account factory pipeline.

3. **Define Account Specifications**: Specify account configurations in Terraform code.

4. **Provision Accounts**: Run Terraform to create new AWS accounts as per the specifications.

By incorporating AFT, you can manage multiple AWS accounts efficiently and ensure consistency across your organisation.

## Pipeline Integration and Best Practices

### Externalising Account Selection

Determine the AWS account to deploy to as part of your CI/CD pipeline:

- **Pipeline Parameters**: Use input parameters or environment variables to specify the target account.

### Workspace Usage

Utilise Terraform workspaces for different purposes within each AWS account:

- **Environment Isolation**: Create workspaces like `blue` and `green` for blue/green deployments.
- **Resource Separation**: Use workspaces to manage different layers or components of your infrastructure.

### State File Management

- **Backend Configuration**: Use consistent backend configurations across accounts, parameterising where necessary.
- **State Locking**: Implement state locking with DynamoDB to prevent concurrent modifications.

### Security Considerations

- **Least Privilege Access**: Ensure IAM roles and policies grant only the necessary permissions.
- **Credential Management**: Use secure methods to store and access AWS credentials (e.g., AWS Secrets Manager, CI/CD pipeline secrets).

## Conclusion

Managing multiple AWS accounts with Terraform requires careful planning around state file management, authentication, and deployment processes. By separating state files per account, leveraging AWS Organisations and Control Tower AFT, and externalising account selection to your deployment pipeline, you can create a scalable and secure multi-account infrastructure.

Implementing these best practices not only enhances security and compliance but also simplifies the complexity involved in multi-account management, allowing your team to focus on delivering value through infrastructure as code.
