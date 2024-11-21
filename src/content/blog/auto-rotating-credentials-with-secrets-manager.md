---
title: "Auto Rotating RDS Credentials with AWS Secrets & System Manager"
description: "Automatically update RDS credentials and application config on EC2 instances."
pubDate: 2020-01-01
author: "Billy"
cardImage: "@/images/blog/rotate-secrets.jpg"
cardImageAlt: "Illustration of rotating secrets on aws"
readTime: 4
tags: ["secrets-manager", "aws"]
---

Automatically rotating credentials is a critical aspect of maintaining secure infrastructure. **AWS Secrets Manager** enables you to follow security best practices by allowing you to rotate your credentials on a set schedule in a safe and controlled manner. In this article, we'll explore how to use AWS Secrets Manager to auto-rotate RDS credentials and dynamically update WordPress configuration on some EC2 instances.

## Infrastructure Overview

We'll be using a common WordPress setup on AWS to test this process:

- **Amazon EC2 Instances**: Running WordPress, managed in an Auto Scaling Group (ASG).
- **Application Load Balancer (ALB)**: Distributing incoming traffic across the EC2 instances.
- **Amazon RDS**: Hosting a MySQL database instance.
- **AWS Secrets Manager**: Storing and rotating database credentials.
- **AWS Systems Manager (SSM)**: Executing commands on EC2 instances to update configurations.
- **AWS Lambda**: Handling the credential rotation logic.

## Solution Overview

Our goal is to have the RDS credentials automatically rotate on a set schedule. When the credentials are rotated, we need the WordPress configuration (`wp-config.php`) on each EC2 instance to automatically update with the new password. Additionally, when new instances are launched (e.g., due to scaling events), they should retrieve the current password at startup and configure `wp-config.php` accordingly.

To achieve this, we'll leverage several AWS services:

- **AWS Secrets Manager**: Stores the RDS credentials and handles the rotation schedule.
- **AWS Lambda**: Performs the credential rotation and updates Secrets Manager.
- **AWS Systems Manager (SSM) Run Command**: Updates the WordPress configuration on all running EC2 instances.

## Setting Up AWS Secrets Manager

First, we'll create a secret in AWS Secrets Manager to store our RDS credentials. If you're using the AWS Management Console, you can enable automatic rotation when creating the secret. This will automatically create a Lambda function with the appropriate IAM role to handle the rotation. If you're using Infrastructure as Code tooling like Terraform, you'll need to create the Lambda function and IAM role separately.

The secret will store the following information:

```json
{
  "host": "ProdServer-01.databases.example.com",
  "port": "3306",
  "username": "administrator",
  "password": "My-P@ssw0rd!F0r+Th3_Acc0unt",
  "dbname": "MyDatabase",
  "engine": "mysql",
  "app": "foo"
}
```

## Configuring the Lambda Function

The Lambda function handles the rotation of the RDS credentials. We need to modify the `setSecret` stage of the Lambda function to perform the additional step of updating the WordPress configuration on all EC2 instances.

To update the `wp-config.php` file on all running EC2 instances, we'll use **AWS Systems Manager's Run Command** feature. This allows us to execute commands on multiple instances simultaneously.

**Prerequisites:**

- **SSM Agent**: Ensure that the SSM Agent is installed on all EC2 instances.
- **IAM Roles**:
  - **EC2 Instance Profile**: Attach an IAM role to the EC2 instances with permissions to communicate with SSM.
  - **Lambda Execution Role**: The Lambda function must have permissions to execute `ssm:SendCommand`.

In the `setSecret` stage of your Lambda function, add the following code:

```python
import boto3

ssm = boto3.client('ssm')

# Retrieve the password and app name from the secret
new_password = pending_dict['password']
app_name = pending_dict.get('app', 'default')

# Define the command to update wp-config.php
command = """
rm -f /tmp/wp-config.php.bak;
cp /var/www/html/wp-config.php /tmp/wp-config.php.bak;
while IFS= read LINE; do
  echo "$LINE" | grep -iq DB_PASSWORD;
  if [ "$?" = "0" ]; then
    echo 'define("DB_PASSWORD", "%s");';
  else
    echo "$LINE";
  fi;
done < /tmp/wp-config.php.bak > /var/www/html/wp-config.php
""" % new_password

# Send the command to EC2 instances with the specified tag
response = ssm.send_command(
  Targets=[
    {
      'Key': 'tag:app',
      'Values': [app_name]
    }
  ],
  DocumentName='AWS-RunShellScript',
  Parameters={
    "commands": [command]
  }
)
```

**Explanation:**

- **Targets**: We target EC2 instances based on a tag (e.g., `app: foo`). This allows us to update instances belonging to a specific application or environment.
- **Command**: The shell script updates the `wp-config.php` file, replacing the old database password with the new one.

## Testing password rotation using AWS Secrets Manager

Once everything is setup, we can manually test the rotation process:

- **Manually trigger the rotation** in AWS Secrets Manager.
- **Verify** that the secret's password has been updated.
- **Check** the `wp-config.php` file on your EC2 instances to ensure it contains the new password.
- **Confirm** that WordPress is functioning correctly and can connect to the database.

## Additional Considerations

- **Security**: Ensure that IAM roles and policies grant the least privilege necessary.
- **Scaling**: For instances launched after a rotation, make sure your instance retrieves the latest password from Secrets Manager.
- **Monitoring**: Implement logging and monitoring to detect and raise alerts if issues are hit during the rotation process.

## Conclusion

With AWS Secrets Manager and a few lines of updated Python code, we can automate the process of rotating RDS credentials and updating application configurations. This approach enhances security by regularly updating credentials without manual intervention and ensures high availability by seamlessly updating running instances.
