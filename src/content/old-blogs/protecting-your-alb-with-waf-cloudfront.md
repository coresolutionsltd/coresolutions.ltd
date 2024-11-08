Protecting your ALB with WAF & Cloudfront

You can protect load balancers from unwanted traffic in various ways. You can achieve this by using feature rich third party products such as Cloudflare & Incapsula. Or depending on the use case, you can also leverage native AWS services. In this post, I’ll be focusing on using ALB with WAF & Cloudfront. I’ll also cover the techniques that you can deploy in order to lock down a load balancer, meaning it only accepts valid traffic originating from Cloudfront.
Solution Overview

Our solution comprises of a Cloudfront distribution which adds an origin token header and two Web ACLs. One is associated with the Cloudfront distribution and the other is associated with the application load balancer.
ALB with WAF & Cloudfront
Cloudfront

In order for our solution to work we’ll need to add an origin token header to the cloudfront distribution. You’ll be passing this into the origin ALB. I wont go into the full setup and configuration of the cloudfront distribution. Instead, I’ll show the relevant parts we’ll need to add.

resource "random_string" "origin_token" {
  length = 30
  special = false
}

resource "aws_cloudfront_distribution" "distribution" {
  origin {
    domain_name   = aws_lb.example.arn
    origin_id            = "alb"
    custom_header {
      name = "X-Origin-Token"
      value = random_string.origin_token.results
    }
  }

  enabled = true
  aliases   = ["yoursite.example.com"]

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id     = "alb"

    forwarded_values {
      query_string = true
      headers        = ["X-Origin-Token"]

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

Instead of just forwarding the X-Origin-Token header you can replace it with [“*”] to forward all headers. We’re using this header as it’s what the WAF module we’ll be using later looks for when the origin_token variables passed in.
WAF

The Web ACL associated with the Cloudfront distribution is where you can apply any necessary front end protection. The example shown below is applying some AWS managed rule sets & rate limiting. You can of course extend this depending on your requirements.

module "cloudfront_waf" {
  source = "coresolutions-ltd/wafv2/aws"

  name_prefix      = "Cloudfront"
  default_action   = "allow"
  scope                = "CLOUDFRONT"
  rate_limit          = 1000
  managed_rules = ["AWSManagedRulesCommonRuleSet",
                                "AWSManagedRulesAmazonIpReputationList",
                                "AWSManagedRulesAdminProtectionRuleSet",
                                "AWSManagedRulesKnownBadInputsRuleSet",
                                "AWSManagedRulesLinuxRuleSet",
                                "AWSManagedRulesUnixRuleSet"]
}

You’ll see the Web ACL associated with the applications load balancer is set to the default action. This will only be allowing traffic containing the origin token header that we defined earlier in the Cloudfront distribution.

module "waf" {
  source = "coresolutions-ltd/wafv2/aws"

  name_prefix    = "ALB"
  default_action = "block"
  scope              = "REGIONAL"
  origin_token    = random_string.origin_token.results
}

resource "aws_wafv2_web_acl_association" "waf_association" {
  resource_arn = aws_lb.example.arn
  web_acl_arn  = module.waf.waf_arn
}

Requests you may get that don’t contain the X-Origin-Token with the correct value should now be blocked before they hit our ALB by the associated Web ACL.
ALB Security Group

We need our ALB security group to allow ingress traffic from Cloudfront. We could keep it wide open and solely rely on the origin token header WAF rule to only permit traffic from Cloudfront. But lets look at how we can limit this down to only allow requests originating from the Cloudfront IP ranges.

We can add the current full list to our security group at deployment time by leveraging the following data block.

data "aws_ip_ranges" "cloudfront" {
    services = ["cloudfront"]
}

Next, you could raise a service request to up the security group rule limit. You could also split the list up into chunks and create the security group(s). Your Cloudfront IP list won’t be maintained following your deployment, they’ll only be updated by you running future terraform deployments.

AWS recommends creating a lambda which subscribes to an SNS topic for Amazon IP changes. You can find full details on how to set this up manually here. Alternatively you can leverage the below terraform module which creates all of the required resources.

module "cloudfront-sg-updater" {
  source  = "coresolutions-ltd/cloudfront-sg-updater/aws"
}

You can customise the lambda by passing in the optional name and tag variables. You can find full module details here.

Once you have the lambda up and running, you’ll need to add three tags to your security groups. Your security groups will now dynamically update and be maintained by the lambda.

    Name: cloudfront_g or cloudfront_r
    AutoUpdate: true
    Protocol: http or https

    cloudfront_g represents the global cloudfront IP ranges whereas cloudfront_r represents regional ranges

The AWS blog post goes into richer detail and also how to test the lambda is working as expected. It’s definitely worth checking out if you’re looking to implement this solution.

After evaluating various ways to natively protect an ALB, we opted to protect our ALB with WAF & Cloudfront using the above solution as it’s flexible, robust and also easy to implement.
