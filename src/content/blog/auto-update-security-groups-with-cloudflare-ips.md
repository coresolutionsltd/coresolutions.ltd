---
title: "Auto Update Security Groups with Cloudflare IPs"
description: "How to auto update security groups with Cloudflare IPs using AWS Lambda"
pubDate: 2020-01-01
author: "Billy"
cardImage: "@/images/blog/cloudflare-ips.jpg"
cardImageAlt: "Illustration of security groups being updated with cloudflare ips"
readTime: 4
tags: [ "cloudflare", "aws" ]
---

When leveraging **Cloudflare** to protect your website from malicious actors, you need to allow Cloudflare's IP addresses to send visitor requests to your origin server. This is achieved by whitelisting Cloudflare's IP addresses in your AWS Security Groups.

While you can manually add Cloudflare IPs during your infrastructure deployment, Cloudflare's IP list can change over time. Unless you're frequently updating your deployment, your Security Groups may become outdated, potentially blocking legitimate traffic.

In this article, we'll explore how to automate the process of updating AWS Security Groups with the latest Cloudflare IP addresses using Terraform.

## Solution Overview

We've created a Terraform module that deploys a Lambda function. This function runs periodically (by default, once a day) and updates Security Groups with the latest Cloudflare IP addresses. The Lambda function:

- Searches for Security Groups tagged with `CF-AutoUpdate = true`.
- For each found Security Group, it looks for a `CF-Ports` tag containing a comma-separated list of ports.
- Updates the Security Group's ingress rules to allow traffic from Cloudflare's IPv4 addresses on the specified ports.
- Defaults to port **443** if no `CF-Ports` tag is found.

This approach allows each Security Group to independently control which ports are required and toggle the auto-update functionality on or off via tags.

## Terraform Module Usage

You can use the following Terraform module to set up the Lambda function:

```hcl
module "cloudflare-sg-updater" {
  source = "coresolutions-ltd/cloudflare-sg-updater/aws"
}
```

This module handles the creation of the Lambda function, IAM roles, and CloudWatch Event Rule to trigger the function on a schedule. For more information, including configuration options and inputs, refer to the [Terraform Registry documentation](https://registry.terraform.io/modules/coresolutions-ltd/cloudflare-sg-updater/aws/latest).

## How the Lambda Function Works

The Lambda function is written in Python and utilizes the `boto3` library to interact with AWS services.

**Importing the EC2 Resource**

```python
import boto3

ec2 = boto3.resource('ec2')
```
> Using the EC2 resource provides a higher-level abstraction compared to the client interface, making it easier to work with AWS resources.

**Filtering Security Groups by Tags**

We search for all Security Groups that have the `CF-AutoUpdate` tag set to `true`:

```python
groups = ec2.security_groups.filter(
    Filters=[
        {'Name': 'tag:CF-AutoUpdate', 'Values': ['true']},
    ]
)
```
This returns an iterable collection of SecurityGroup resources that match the specified filter.

For each Security Group, we check for the `CF-Ports` tag to determine which ports need to be updated. If the tag is not present, we default to port `443`.

```python
for security_group in groups:
    ports_tag = next((tag for tag in security_group.tags if tag["Key"] == "CF-Ports"), None)

    if ports_tag:
        ports = [int(port.strip()) for port in ports_tag['Value'].split(",")]
    else:
        ports = [443]
```

**Fetching Cloudflare’s IP Addresses**

We retrieve the latest list of Cloudflare IPv4 addresses:

```python
import requests

response = requests.get('https://www.cloudflare.com/ips-v4')
cloudflare_ips = response.text.splitlines()
```

For each Security Group and port, we compare the current ingress rules with active Cloudflare’s IPs. We add missing rules and remove obsolete ones.

**Getting Current Ingress Rules**
```python
current_rules = group.ip_permissions
```

**Adding Missing Rules**
```python
for port in ports:
    for ip in cloudflare_ips:
        if not rule_exists(current_rules, ip, port):
            security_group.authorize_ingress(
                IpProtocol='tcp',
                CidrIp=ip,
                FromPort=port,
                ToPort=port
            )
```

**Removing Obsolete Ingress Rules**
```python
for port in ports:
    for ip in cloudflare_ips:
        if not rule_exists(current_rules, ip, port):
            security_group.authorize_ingress(
                IpProtocol='tcp',
                CidrIp=ip,
                FromPort=port,
                ToPort=port
            )
```

## Conclusion

Automating the update of AWS Security Groups with Cloudflare IPs ensures that your infrastructure remains secure and accessible without manual intervention. By using tags, you gain granular control over which Security Groups are updated and which ports are allowed.

This approach is flexible and scalable:

- **Independent Control**: Each Security Group can specify its required ports via the CF-Ports tag.
- **Single Lambda Function**: A single Lambda function can update multiple Security Groups, simplifying management.
- **Easy Toggle**: Enable or disable the auto-update functionality per Security Group by setting or removing the `CF-AutoUpdate` tag.

Best of all, this entire process is seamlessly handled by a Terraform module, requiring only the addition of a few tags to your existing resources.
