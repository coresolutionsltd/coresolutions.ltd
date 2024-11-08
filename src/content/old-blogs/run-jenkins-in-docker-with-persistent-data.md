Run Jenkins in Docker with persistent data

Sometimes instantiating a fresh Jenkins instance is perfect for testing various aspects of the CI pipeline. Whether this is to test major changes in a safe and controlled manner completely separate from your existing pipelines or to test new plugins or processes without any risk.

By far the quickest and easiest way is to spin up a Docker container running Jenkins.

docker run -p 8080:8080 jenkinsci/blueocean

This is perfect for testing one off configuration tests. However any changes made will not persist. If you’d like a Jenkins instance running on docker that persists the data between shutdowns then you should look at using Docker Compose with a volume specified:

version: '3'
services:
  jenkins:
    container_name: jenkins
    image: 'jenkinsci/blueocean'
    ports:
      - '8080:8080'
      - '8443:8443'
      - '50000:50000'
    volumes:
      - 'jenkins_home:/var/jenkins_home'
volumes:
  jenkins_home:
    driver: local

With this docker-compose.yml template you can persist all jenkins configurations between shutdowns. You can then of course extend your Docker Jenkins instance by creating a new Docker image with a Dockerfile using the above Jenkins Blue Ocean image:

FROM jenkinsci/blueocean

USER root

RUN apk add python py-pip; pip install awscli
RUN wget https://releases.hashicorp.com/terraform/0.12.26/terraform_0.12.26_linux_amd64.zip; unzip terraform_0.12.26_linux_amd64.zip -d /bin; rm terraform_0.12.26_linux_amd64.zip

USER jenkins

The above Dockerfile example will use jenkinsci/blueocean and add the AWS CLI & Terraform 12.26. Simply build and tag this image locally. You can then swap out the image value in your docker-compose file.

docker build -t jenkins .

By leveraging the above you can very quickly have a local isolated test instance of Jenkins. This can be fully customised to fit your bespoke testing requirements.
