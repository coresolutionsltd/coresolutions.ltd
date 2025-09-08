---
title: "Deploy OpenTofu/Terraform to AWS using GitHub Actions and OIDC"
description: "How to securely deploy to AWS from GitHub Actions using OIDC"
pubDate: 2025-09-08
author: "Billy"
cardImage: "@/images/blog/github-opentofu-oidc.jpg"
cardImageAlt: "Illustration of a secure CI/CD pipeline"
readTime: 2
tags: ["github", "aws", "opentofu", "terraform"]
---

# Deploy to AWS using GitHub Actions and OIDC: Secure CI/CD with OpenTofu / Terraform

GitHub Actions make CI/CD simple and powerful, but securely accessing AWS resources from runners requires care. Traditionally, this meant storing long-lived AWS access keys as GitHub secrets, a practice with obvious security risks. With OpenID Connect (OIDC), we now have a modern, keyless authentication method between GitHub Actions and AWS.

In this technical deep-dive, we'll explore how GitHub OIDC works with AWS, how to set it up, and how to integrate it with OpenTofu/Terraform for infrastructure deployment.

## Understanding the OIDC Flow

Before diving into implementation, let's understand how GitHub OIDC authentication works with AWS:

1. **Token Generation**: When a GitHub Action runs, GitHub automatically generates a JSON Web Token (JWT) that contains information about the workflow, repository, and execution context.

2. **Token Exchange**: The GitHub Action presents this JWT to AWS STS (Security Token Service) via the OIDC identity provider.

3. **Token Validation**: AWS validates the JWT signature and claims against the configured OIDC identity provider and IAM role trust policy.

4. **Role Assumption**: If validation succeeds, AWS STS issues temporary credentials for the specified IAM role.

5. **Resource Access**: The GitHub Action can now use these temporary credentials to access AWS resources.

## Setting Up the AWS OIDC Identity Provider

First, we need to create an OIDC identity provider in AWS that trusts GitHub's token issuer.

### Using AWS CLI

```bash
aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### Using Terraform/OpenTofu

```hcl
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com",
  ]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1"
  ]

  tags = {
    Name = "GitHub OIDC Provider"
  }
}
```

**Important Notes:**

- The thumbprint `6938fd4d98bab03faadb97b34396831e3780aea1` is GitHub's current root CA thumbprint
- The client ID must be `sts.amazonaws.com` for AWS STS integration
- The URL must be `https://token.actions.githubusercontent.com`

## Creating the IAM Role

Now we need to create an IAM role that GitHub Actions can assume. The key is configuring the trust policy to validate specific JWT claims.

### Trust Policy Configuration

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT-ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:your-org/your-repo:*"
        }
      }
    }
  ]
}
```

### Complete IAM Role with Terraform/OpenTofu

```hcl
data "aws_caller_identity" "current" {}

# IAM role for GitHub Actions
resource "aws_iam_role" "github_actions_role" {
  name = "OpenTofuExecutionRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = [
              "repo:your-org/your-repo:ref:refs/heads/main",
              "repo:your-org/your-repo:ref:refs/heads/develop",
              "repo:your-org/your-repo:pull_request"
            ]
          }
        }
      }
    ]
  })

  tags = {
    Name = "GitHub Actions OpenTofu Role"
  }
}

# Policy for OpenTofu operations
resource "aws_iam_policy" "opentofu_policy" {
  name        = "OpenTofuDeploymentPolicy"
  description = "Policy for OpenTofu deployments via GitHub Actions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          # S3 permissions for state backend
          "s3:ListBucket",
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",

          # DynamoDB permissions for state locking
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:DescribeTable",

          # EC2 permissions (adjust based on your needs)
          "ec2:*",

          # IAM permissions (be as restrictive as possible)
          "iam:ListRoles",
          "iam:ListPolicies",
          "iam:GetRole",
          "iam:GetPolicy",
          "iam:CreateRole",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:DeleteRole",

          # Add other AWS services as needed
        ]
        Resource = "*"
      }
    ]
  })
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "github_actions_policy_attachment" {
  role       = aws_iam_role.github_actions_role.name
  policy_arn = aws_iam_policy.opentofu_policy.arn
}

# Output the role ARN for use in GitHub Actions
output "github_actions_role_arn" {
  value       = aws_iam_role.github_actions_role.arn
  description = "ARN of the IAM role for GitHub Actions"
}
```

## Understanding JWT Claims and Conditions

The JWT token from GitHub contains several claims that we can use in our trust policy conditions:

### Key JWT Claims

- `aud`: Always `sts.amazonaws.com` for AWS integration
- `sub`: Subject identifier (e.g., `repo:owner/repo:ref:refs/heads/main`)
- `iss`: Issuer, always `https://token.actions.githubusercontent.com`
- `repository`: Repository name (`owner/repo`)
- `repository_owner`: Repository owner
- `ref`: Git reference (branch, tag, or PR)
- `actor`: GitHub username that triggered the workflow

### Advanced Condition Examples

```json
{
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:repository_owner": "your-org"
    },
    "StringLike": {
      "token.actions.githubusercontent.com:sub": "repo:your-org/*:*"
    },
    "ForAnyValue:StringEquals": {
      "token.actions.githubusercontent.com:ref": [
        "refs/heads/main",
        "refs/heads/develop"
      ]
    }
  }
}
```

This configuration:

- Restricts access to repositories owned by `your-org`
- Allows any repository under the organization
- Only permits deployments from `main` and `develop` branches

## GitHub Actions Workflow Implementation

Now let's implement the GitHub Actions workflow using the OIDC authentication. The below example uses our [TF GitHub Action](https://github.com/coresolutionsltd/tf-github-action). You can of course use a different action to complete these steps, or run the individual steps yourself. We find leveraging an action like this though reduces code duplication and ensures consistent implementation of workflows across projects.

### Complete Workflow Example

```yaml
name: Deploy Infrastructure

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

permissions:
  id-token: write # Required for OIDC token generation
  contents: read # Required to checkout code

jobs:
  plan:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/OpenTofuExecutionRole
          role-session-name: github-actions-opentofu-session
          aws-region: eu-west-2
          # Optional: specify role duration (default: 1 hour, max: 12 hours)
          role-duration-seconds: 3600

      - name: Verify AWS credentials
        run: |
          aws sts get-caller-identity
          echo "AWS credentials configured successfully"

      - name: Validate and Plan
        uses: coresolutionsltd/tf-github-action@v1.0.0
        with:
          workdir: ./infra
          env: prod
          steps: validate plan

  apply:
    runs-on: ubuntu-latest
    needs: plan
    environment: prod # This environment can have protection rules which requires approval

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/OpenTofuExecutionRole
          role-session-name: github-actions-opentofu-session
          aws-region: eu-west-2
          # Optional: specify role duration (default: 1 hour, max: 12 hours)
          role-duration-seconds: 3600

      - name: Verify AWS credentials
        run: |
          aws sts get-caller-identity
          echo "AWS credentials configured successfully"

      - name: Apply
        uses: coresolutionsltd/tf-github-action@v1.0.0
        with:
          workdir: ./infra
          env: prod
          steps: apply
```

## Advanced Configuration Options

### Multi-Environment Setup

For different environments, you can use separate IAM roles:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ github.ref == 'refs/heads/main' &&
      'arn:aws:iam::123456789012:role/ProdOpenTofuRole' ||
      'arn:aws:iam::123456789012:role/DevOpenTofuRole' }}
    role-session-name: ${{ github.run_id }}-${{ github.run_attempt }}
    aws-region: eu-west-2
```

### Cross-Account Deployment

For deploying to multiple AWS accounts:

```yaml
strategy:
  matrix:
    environment: [dev, staging, prod]
    include:
      - environment: dev
        account_id: "111111111111"
        region: "eu-west-1"
      - environment: staging
        account_id: "222222222222"
        region: "eu-west-2"
      - environment: prod
        account_id: "333333333333"
        region: "eu-west-2"

steps:
  - name: Configure AWS credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::${{ matrix.account_id }}:role/OpenTofuExecutionRole
      role-session-name: deploy-${{ matrix.environment }}-${{ github.run_id }}
      aws-region: ${{ matrix.region }}
```

## Security Best Practices

### 1. Principle of Least Privilege

Always grant the minimum permissions necessary:

```hcl
# Instead of using wildcard permissions
resource "aws_iam_policy" "restrictive_policy" {
  name = "RestrictiveOpenTofuPolicy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeSecurityGroups",
          "ec2:RunInstances",
          "ec2:TerminateInstances"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion": ["eu-west-1", "eu-west-2"]
          }
        }
      }
    ]
  })
}
```

### 2. Branch and Repository Restrictions

Use specific conditions in your trust policy:

```json
{
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
    },
    "StringLike": {
      "token.actions.githubusercontent.com:sub": [
        "repo:your-org/infrastructure:ref:refs/heads/main",
        "repo:your-org/infrastructure:ref:refs/heads/release/*"
      ]
    }
  }
}
```

### 3. Session Duration Limits

Set appropriate session durations:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/OpenTofuExecutionRole
    role-session-name: session
    aws-region: eu-west-2
    role-duration-seconds: 1800 # 30 minutes
```

## Troubleshooting Common Issues

### 1. "No OpenIDConnect provider found" Error

This error occurs when the OIDC provider isn't properly configured:

```bash
# Check if provider exists
aws iam list-open-id-connect-providers

# Verify thumbprint is correct
aws iam get-open-id-connect-provider \
  --open-id-connect-provider-arn arn:aws:iam::ACCOUNT:oidc-provider/token.actions.githubusercontent.com
```

### 2. "AssumeRoleWithWebIdentity is not authorized" Error

This indicates a trust policy issue. Common causes:

- Incorrect repository name in the subject condition
- Missing or incorrect audience claim
- Branch restrictions not matching the current branch

### 3. Insufficient Permissions

Monitor CloudTrail logs to identify missing permissions:

```json
{
  "eventName": "AssumeRoleWithWebIdentity",
  "errorCode": "AccessDenied",
  "errorMessage": "User is not authorized to perform: sts:AssumeRoleWithWebIdentity"
}
```

## Conclusion

GitHub OIDC with AWS provides a secure, keyless authentication mechanism that eliminates the need for long-lived credentials. By properly configuring the OIDC identity provider, IAM roles, and trust policies, you can create a robust CI/CD pipeline that follows security best practices.

Key benefits of this approach:

- **No secrets management**: No AWS access keys to rotate or secure
- **Short-lived credentials**: Temporary tokens that expire automatically
- **Fine-grained access control**: Precise conditions based on repository, branch, and other claims
- **Audit trail**: Complete visibility into authentication and authorization events

The combination of GitHub Actions OIDC and OpenTofu/Terraform creates a powerful, secure infrastructure-as-code deployment pipeline that scales with your needs while maintaining security best practices.

Remember to regularly review and update your IAM policies, monitor CloudTrail logs for suspicious activity, and follow the principle of least privilege when granting permissions to your GitHub Actions workflows.
