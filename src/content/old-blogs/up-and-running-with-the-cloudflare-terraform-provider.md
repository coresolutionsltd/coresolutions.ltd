Up and running with the Cloudflare Terraform Provider
Cloudflare Terraform Provider

By leveraging the Cloudflare Terraform provider you can manage your Cloudflare resources using the same refined processes and pipelines you already have in place for your cloud infrastructure.

Configuration kept in version control reaps various benefits, such as auditable changes and ease of rollback when issues occur. It’s clear to see why when managing vital infrastructure this is the preferred approach.
Credentials

In order to create, modify and delete resources in your Cloudflare account we first need some authentication. Within Terraform you would add this within the provider block.

Storing credentials in Systems Manager Parameter Store gives us added flexibility when rotating credentials. It also greatly improves our security stance. After creating the secure parameters in SSM we can then pull them into Terraform by using the following aws_ssm_parameter data blocks.

data "aws_ssm_parameter" "cloudflare_email" {
name = "cloudflare_email"
}

data "aws_ssm_parameter" "cloudflare_key" {
name = "cloudflare_key"
}

We can then use the values within the Cloudflare provider block.

provider "cloudflare" {
version = "~> 2.0"
email = data.aws_ssm_parameter.cloudflare_email.value
api_key = data.aws_ssm_parameter.cloudflare_key.value
}

The account_id argument is for configuring the API client with the provided account ID. If provided all calls use the account API rather than the user API. This is recommended if multiple users are managing account resources.
Zones

Cloudflare Zones are created with the cloudflare_zone resource. A Cloudflare zone is roughly equivalent to a domain name. With zones we can specify the plan and the type. The default type is full but we could also specify partial for a CNAME setup if required.

resource "cloudflare_zone" "test" {
zone = "myawesomedomain.com"
plan = "free"
type = "partial"
}

Zone settings are applied using the cloudflare_zone_settings_override resource. The settings will be reset to their initial values if this resource is destroyed.

resource "cloudflare_zone_settings_override" "test" {
zone_id = cloudflare_zone.core.id
settings {
brotli = "on"
challenge_ttl = 2700
security_level = "high"
opportunistic_encryption = "on"
automatic_https_rewrites = "on"
mirage = "on"
waf = "on"
minify {
css = "on"
js = "off"
html = "off"
}
security_header {
enabled = true
}
}
}

Data blocks can be leveraged to make changes to existing zones.

data "cloudflare_zones" "example" {
filter {
name = "example.com"
}
}

The filter section is used used to look up zone records, lookup_type can be used to change the type of search used on the name parameter, values can be either exact and contains.

In order to enable WAF rule groups on a particular zone we need two things. The group ID and the zone ID. Our above zone data block or zone resource will allow us to get the zone ID. We now just need to use this to pull in the desired group ID for our zone.

data "cloudflare_waf_groups" "misc" {
zone_id = cloudflare_zones.test.id
filter {
name = "Miscellaneous"
}
}

We can now create a cloudflare_waf_group resource with the mode value as “on” to enable to group we filtered for in the cloudflare_waf_groups data block.

resource "cloudflare_waf_group" "misc" {
zone_id = cloudflare_zones.test.id
group_id = data.cloudflare_waf_groups.misc.groups.0.id
mode = "on"
}

Records

Records are created by using the cloudflare_record resource.

resource "cloudflare_record" "www" {
zone_id = cloudflare_zones.test.id
name = "www"
value = var.record_value
type = "CNAME"
proxied = true
ttl = 500
}

resource "cloudflare_record" "www" {
zone_id = cloudflare_zones.test.id
name = "@"
value = var.record_value
type = "CNAME"
proxied = true
ttl = 500
}

Conclusion

The Cloudflare Terraform provider provides a rich feature set. The above examples are the core building blocks required to get up and running. Once mastered you should be able to build out any required Cloudflare resources using Terraform.
