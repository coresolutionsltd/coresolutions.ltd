---
title: "Protecting your ALB with WAF & Cloudfront"
description: "Learn how to protect your ALB with AWS WAF and CloudFront."
pubDate: 2020-01-01
author: "Billy"
cardImage: "@/images/blog/alb-waf-cloudfront.jpg"
cardImageAlt: "Protecting your ALB with WAF & Cloudfront"
readTime: 3
tags: ["opentofu", "terraform", "aws"]
---

Protecting your Application Load Balancer (ALB) from unwanted traffic is essential for maintaining the security and performance of your applications. While third-party products like Cloudflare and Incapsula offer feature-rich solutions, you can also leverage native AWS services to achieve robust protection. In this post, we'll focus on using AWS's own Web Application Firewall (WAF) and CloudFront to secure your ALB. We'll explore techniques to lock down your load balancer so that it only accepts valid traffic originating from CloudFront.

## Solution Overview

Our solution consists of a CloudFront distribution that adds an origin token header and two Web Access Control Lists (Web ACLs) provided by AWS WAF:

1. **CloudFront Web ACL**: Applies front-end protections like AWS Managed Rules and rate limiting.
2. **ALB Web ACL**: Ensures only requests containing the correct origin token header reach the ALB.

By combining these components, we create a layered security approach that filters traffic both at the edge and before it reaches your application servers.

## CloudFront Configuration

To implement this solution, we'll configure our CloudFront distribution to add an origin token header that will be passed to the origin ALB. While we won't cover the entire setup of the CloudFront distribution, we'll focus on the essential parts that need to be configured.

First, we'll generate a random origin token:

```
resource "random_string" "origin_token" {
  length  = 30
  special = false
}
```

Then, we'll set up the CloudFront distribution with the custom header:

```
resource "aws_cloudfront_distribution" "distribution" {
  origin {
    domain_name = aws_lb.example.dns_name
    origin_id   = "alb"
    custom_header {
      name  = "X-Origin-Token"
      value = random_string.origin_token.result
    }
  }

  enabled = true
  aliases = ["yourdomain.example.com"]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "alb"

    forwarded_values {
      query_string = true
      headers      = ["X-Origin-Token"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }
}

```

> **Note**: Instead of forwarding only the `X-Origin-Token` header, you can set `headers = ["*"]` to forward all headers. We're using this specific header because the WAF module we'll use later checks for the `X-Origin-Token` with the expected value.

## Configuring AWS WAF

We will create two Web ACLs using AWS WAF to enhance our security posture.

### CloudFront Web ACL

The Web ACL associated with the CloudFront distribution applies necessary front-end protections, such as AWS Managed Rule Sets and rate limiting. Here's an example configuration:

```
module "cloudfront_waf" {
  source = "coresolutions-ltd/wafv2/aws"

  name_prefix    = "CloudFront"
  default_action = "allow"
  scope          = "CLOUDFRONT"
  rate_limit     = 1000
  managed_rules  = [
    "AWSManagedRulesCommonRuleSet",
    "AWSManagedRulesAmazonIpReputationList",
    "AWSManagedRulesAdminProtectionRuleSet",
    "AWSManagedRulesKnownBadInputsRuleSet",
    "AWSManagedRulesLinuxRuleSet",
    "AWSManagedRulesUnixRuleSet"
  ]
}
```

You can extend or customise these rules based on your security requirements, adding or removing managed rule sets as needed.

### ALB Web ACL

The Web ACL associated with the Application Load Balancer is configured to block all requests by default, only allowing traffic that contains the correct origin token header. Here's how to set it up:

```
module "alb_waf" {
  source = "coresolutions-ltd/wafv2/aws"

  name_prefix    = "ALB"
  default_action = "block"
  scope          = "REGIONAL"
  origin_token   = random_string.origin_token.result
}

resource "aws_wafv2_web_acl_association" "waf_association" {
  resource_arn = aws_lb.example.arn
  web_acl_arn  = module.alb_waf.waf_arn
}
```

With this configuration, any requests that do not contain the `X-Origin-Token` header with the correct value will be blocked before reaching the ALB.

## Configuring the ALB Security Group

To further secure your ALB, you should ensure that it only allows ingress traffic from CloudFront IP ranges. While the WAF rules provide a layer of security, limiting access at the network level adds an extra safeguard.

### Allowing Traffic from CloudFront IP Ranges

AWS publishes the IP ranges used by CloudFront, which can be retrieved and used in your security group rules. Here's how you can add the current list of CloudFront IP ranges to your security group using OpenTofu/Terraform:

```
data "aws_ip_ranges" "cloudfront" {
  services = ["CLOUDFRONT"]
}

resource "aws_security_group" "alb_sg" {
  name        = "alb_sg"
  description = "Allow traffic from CloudFront"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = data.aws_ip_ranges.cloudfront.cidr_blocks
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = data.aws_ip_ranges.cloudfront.cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

> **Note**: AWS security groups have a limit on the number of ingress rules you can add. If the number of CloudFront IP ranges exceeds this limit, you may need to split the ranges into multiple security groups or request a limit increase from AWS Support.

### Dynamically Updating Security Groups

Since CloudFront IP ranges can change over time, it's important to keep your security groups up to date. AWS recommends creating a Lambda function that automatically updates your security groups when IP ranges change.

You can use the following OpenTofu/Terraform module to automate this process:

```
module "cloudfront_sg_updater" {
  source = "coresolutions-ltd/cloudfront-sg-updater/aws"

  # Optional variables to customise the Lambda function
  name = "cloudfront_sg_updater"
  tags = {
    Environment = "production"
  }
}
```

This module sets up:

- An SNS topic subscribed to AWS IP address change notifications.
- A Lambda function that updates your security groups whenever CloudFront IP ranges change.

#### Tagging Security Groups for Automatic Updates

After deploying the Lambda function, add the following tags to your ALB security group so the Lambda knows which groups to update:

- **Name**: `cloudfront_g` (for global CloudFront IP ranges) or `cloudfront_r` (for regional ranges)
- **AutoUpdate**: `true`
- **Protocol**: `http` or `https`

The Lambda function will dynamically update your security groups based on these tags, ensuring your ALB only accepts traffic from the current CloudFront IP ranges.

## Testing the Configuration

To verify that your setup is working as expected:

1. **Access Your Application via CloudFront**
   - Navigate to your CloudFront distribution URL or domain name.
   - Ensure that you can access your application without any issues.

2. **Attempt Direct Access to the ALB**
   - Try accessing your ALB directly via its DNS name or IP address.
   - You should receive an error or be blocked, indicating that direct access is denied.

3. **Check WAF Logs**
   - Review AWS WAF logs in Amazon CloudWatch to confirm that requests without the correct origin token are being blocked.
   - Ensure that legitimate traffic through CloudFront is allowed.

## Additional Security Considerations

- **Regularly Review WAF Rules**: Keep your WAF rules updated to protect against new threats and vulnerabilities.
- **Monitor Logs and Metrics**: Use AWS CloudWatch to monitor your ALB, CloudFront, and WAF metrics for any anomalies.
- **Enable SSL/TLS Encryption**: Ensure that both your CloudFront distribution and ALB are configured to use HTTPS for secure communication.
- **Implement Least Privilege Access**: Limit IAM permissions and access to only what is necessary for your application to function.

## Conclusion

After evaluating various methods to natively protect an ALB, we opted to secure our ALB with AWS WAF and CloudFront using the solution described above. This setup is flexible, robust, and relatively easy to implement. By leveraging AWS services effectively, we ensure that only legitimate traffic reaches our applications, enhancing both security and performance.
