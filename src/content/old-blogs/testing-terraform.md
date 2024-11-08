TODO: update with terraform test native framework

Testing Terraform

Testing should to be done on all layers of an application. Infrastructure as code shouldn’t be an exception.

The benefits of completing testing against our Terraform IaC within our infrastructure pipelines is that we can immediately validate if it’s in a compliant state. These approaches could also enable Test Driven Development (TDD) when writing infrastructure with Terraform. You can use the tools below for integration testing within the CI/CD pipeline, or to enable unit testing of Terraform code. If we complete compliance testing early in the development life cycle, it enables us to quickly catch issues. The later we discover a problem the more expensive it is to fix.
Tools:

kitchen-terraform provides a set of Kitchen plugins which enable the use of Kitchen to converge Terraform configuration and verify the resulting infrastructure systems with InSpec controls. This allows testing of Terraform without breaking production environments.

terraform-compliance is a lightweight, security and compliance focused test framework for Terraform. It aims for a high level of testing abstraction.

Tests are written in feature files. Feature files are plain text files ending with .feature. A feature file can contain only one BDD Feature written in a natural language format called Gherkin. You can use radish to parse feature files. Here’s a list of examples.

serverspec allows you to write RSpec tests to test your Terraform configuration. However it isn’t specifically made for Terraform, It’s been built for unit testing and does it incredibly well.

goss is a YAML based tool. It eases the process of writing tests by allowing the user to generate tests from the current system state. Once the test suite is written they can be executed, waited-on and served as a health endpoint. Goss is very high level and easy to get started with.

inspec is an open source testing and auditing framework for applications and infrastructure. Chef Inspec works by comparing the state of system with the desired state. Inspec then detects violations and generates reports.

Running any of the above tools within the Terraform pipeline enables instant feedback regarding the infrastructures state. You could also leverage AWS Config to continuously inspect your AWS real estate. This can ensure it remains within the compliant boundaries.
A Quick Example using Chef Inspec

The testing pipeline stage could include various Inspec profiles or other compliance and security tests. This would likely include application specific tests to validate the application has deployed exactly as expected and that it meets certain security and compliance criteria.

def terraformApply() {
    sh("""
        cd Terraform/Demo;
        terraform apply tfout -no-color

        mkdir ../../Inspec/files/
        terraform output --json > ../../Inspec/files/output.json
    """)
}

def inspecValidation() {
    sh("""
        inspec exec Inspec/ -t aws:// --input workspace=${params.Colour}
    """)
}

In the test below we’re loading content from the output.json file, this is created in the terraformApply function. This allows us to use all of the values set in outputs.tf within our tests.

# load data from Terraform output
content = inspec.profile.file("output.json")
params = JSON.parse(content)

# store vpc in variable VPC_ID
VPC_ID = params['vpc_id']['value']

describe aws_security_group(group_name: "#{input('workspace')}-Instance-SG") do
  it                                        { should exist }
  its('group_name')              { should eq "#{input('workspace')}-Instance-SG" }
  its('inbound_rules_count') { should eq 2 }
  it                                       { should allow_in(port: 443) }
  it                                       { should allow_in(port: 80) }
  its('vpc_id')                       { should eq VPC_ID }
end

You can find the report of the above test below.

+ inspec exec Inspec/ -t aws:// --input workspace=Blue

Profile: Application Infrastructure Testing (terraform-pipeline)
Version: 1.0.0
Target:  aws://

  EC2 Security Group ID: sg-xxx Name: Blue-Instance-SG VPC ID: vpc-xxx 
     ✔  is expected to exist
     ✔  is expected to allow in {:port=>443}
     ✔  is expected to allow in {:port=>80}
     ✔  group_name is expected to eq "Blue-Instance-SG"
     ✔  inbound_rules_count is expected to eq 2
     ✔  vpc_id is expected to eq "vpc-xxx"

Test Summary: 6 successful, 0 failures, 0 skipped

If any of the tests fail, Jenkins will stop and mark the whole build as a failure.
terraform testing with inspec failure

A benefit of having functional tests within the pipeline is that every single deployment of infrastructure will be validated each time a build is ran. Any feedback is given directly via the pipeline status.
terraform testing with inspec success

The above example can be found here, along with a Dockerfile to create a Jenkins image. This includes Terraform and Inspec for testing pipelines locally.

Inspec is an incredible tool. Profiles can be used to test all areas of AWS to ensure everything is configured correctly. You can run Inspec via SSM to get a deeper insight to ensure all configurations are compliant. You can use Securty Hub to perform correlation, allowing you to quickly search based on various different aspects. Jonathan Rau did a fantastic walkthrough on using Chef Inspec with SSM and Security Hub.
Conclusion

In regards to testing Terraform we would recommend using a full suite of unit tests in your preferred framework to enable TDD with your Terraform code. You should leverage linters with pre-commit hooks, allowing you to validate everything before pushing to your repos. Pre commit hooks can validate the Terraform configuration and also check for security related issues, such as private keys and AWS credentials. An integration test suite should then be ran post deployment to ensure everything deployed is fully functional and compliant.

If you leverage other testing frameworks that are working well for you with Terraform, feel free to get in touch and let us know, we’d love to hear from you!
