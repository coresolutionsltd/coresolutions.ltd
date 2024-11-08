Terraform Pipeline Structure with Jenkins

Running Terraform locally is perfect when creating and testing new functionality in development or testing accounts. However, it’s best not to use this approach for staging and production environments. A Terraform Pipeline gives us predictable, well defined and repeatable actions to take when deploying Terraform infrastructure.

In this post we’ll run through the base structure of a Terraform pipeline in Jenkins. There are multiple ways to achieve the desired results, we will keep it as lean and efficient as possible.
Why Terraform?

If you’re thinking Infrastructure as Code you have a few options, depending on the cloud provider you’re leveraging this will likely be ‘something’ vs Terraform. There’s nothing wrong with being all in on AWS and leveraging CloudFormation, sometimes that’s the perfect fit. But if you’re looking for added flexibility, a wealth of opensource modules and community experience backed by an enterprise grade solution then you may lean towards adopting Terraform.
Why Jenkins?

Jenkins is by no means perfect, there are other CI options that people love for good reason, however Jenkins is extremely common. Most organisations are using Jenkins in some aspect of their SDLC, that’s why I’m using it in this example.

The Terraform Pipeline used here has various stages, all of which you would expect when leveraging Terraform. They all use the Terraform/Demo directory. With larger projects you would have multiple directories here to separate the various components or tiers. This can be useful for shared components as you’d control which Terraform configuration is deployed via parameters. This approach benefits from a reduced blast radius due to every component having their own state file. It also reduces any risks when making changes to individual components.
Stages
terraform pipeline stages

    Init – Initialises Terraform with the backend s3 bucket defined in the environment section.
    Plan – Creates the Terraform plan. If the Action parameter is set to Destroy, the destroy flag will be inserted when creating the plan.
    Approval – Input step which waits for manual approval. This allows us to review the output from the plan stage and proceed if everything looks correct.
    Apply – Apply the generated Terraform plan.

All stages are located in the Jenkinsfile

You’ll find the Terraform plan in the output of the plan stage. You’ll need to fully review changes before approving and applying. The added bonus of running Terraform via Jenkins is we get a verbose audit trail of who approved & applied changes to which environment.
terraform plan output

Setup and usage instructions are located in the repo if you’d like to give it a spin yourself.

This simple terraform pipeline is a perfect starting point. You can extend it to fit your exact requirements with multiple layers, multiple AWS accounts, blue / green deployments and so on. I wanted to keep the initial version as simple as possible. Be sure to check the master branch for any added functionality, or if there is anything specific you need feel free to get in touch.

If you hit any issues or have any questions feel free to either leave a comment below or raise an issue on GitHub
