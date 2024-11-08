GitOps for Kubernetes with Argo CD
What is GitOps?

GitOps is a technique of leveraging Git to manage infrastructure provisioning and software deployments. GitOps uses many of the features of Git to manage and trigger deployments. Pull Requests are used to view changes between deployments, this process allows changes to be fully validated and reviewed.

GitOps uses a single Git repository as the source of truth for your desired infrastructure. The same source of truth should be used for all environments where the infrastructure is required. This limits code duplication, ensures all development and staging environments are aligned exactly to production and also builds confidence when applying changes to production.

Infrastructure as code is used to instantiate all infrastructure. This is the practice of keeping all infrastructure configuration stored as code. Any infrastructure changes should be applied by extending the source of truth repository via pull requests. Ideally, no console changes should be applied. However, if they’re absolutely necessary, they should be short-lived and committed to the Git repository ASAP.
What is ArgoCD?

Argo CD is an enterprise grade GitOps Kubernetes deployment tool that uses Git repositories as the source of truth. It can leverage various declarative deployment mechanisms such as Kubernetes manifests, kustomize, ksonnet and HELM.

Argo CD is implemented as a Kubernetes controller. It monitors running applications and compares the deployed state against the desired one in Git. Argo CD reports and visualises the differences, while providing facilities to automatically or manually update the live state with the desired target state.

Components can be defined using Kubernetes manifests, created via the argocd command line tool or via the UI.

An Application is a group of Kubernetes resources defined by a Custom Resource Definition (CRD) manifest. A minimal application spec is as follows:

apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: helm-guestbook
  destination:
    server: https://kubernetes.default.svc
    namespace: guestbook

The syncPolicy block allows us to state whether updates to the repository containing the Kubernetes resources will contentiously deploy or not. An example of implementing an automated sync policy via a manifest file can be seen below:

# Sync policy
  syncPolicy:
    automated: # automated sync by default retries failed attempts 5 times with following delays between attempts ( 5s, 10s, 20s, 40s, 80s ); retry controlled using `retry` field.
      prune: true # Specifies if resources should be pruned during auto-syncing ( false by default ).
      selfHeal: true # Specifies if partial app sync should be executed when resources are changed only in target Kubernetes cluster and no git change detected ( false by default ).
      allowEmpty: false # Allows deleting all application resources during automatic syncing ( false by default ).
    syncOptions:     # Sync options which modifies sync behavior
    - Validate=false # disables resource validation (equivalent to 'kubectl apply --validate=false') ( true by default ).
    - CreateNamespace=true # Namespace Auto-Creation ensures that namespace specified as the application destination exists in the destination cluster.
    - PrunePropagationPolicy=foreground # Supported policies are background, foreground and orphan.
    - PruneLast=true # Allow the ability for resource pruning to happen as a final, implicit wave of a sync operation
    # The retry feature is available since v1.7
    retry:
      limit: 5 # number of failed sync attempt retries; unlimited number of attempts if less than 0
      backoff:
        duration: 5s # the amount to back off. Default unit is seconds, but could also be a duration (e.g. "2m", "1h")
        factor: 2 # a factor to multiply the base duration after each failed retry
        maxDuration: 3m # the maximum amount of time allowed for the backoff strategy

The full Application spec can be found here.
Up and Running with ArgoCD
Installation

Run the following commands to install ArgoCD into your Kubernetes cluster.

kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

Once everything is up and running you can setup port-forwarding to access the ArgoCD UI.

kubectl port-forward svc/argocd-server -n argocd 8080:443

The ArgoCD UI should now be accessible via localhost:8080. If you’re using the latest version, the default username is admin whilst the password can be retrieved with the following command.

kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

Hello Argo

Once you’re logged in you can use the UI to create your first hello world application by clicking the New App button.

The argocd-example-apps repository contains various example apps for testing Argo CD configurations. Use this as the Repository URL and pick one of the example apps as the Path.

The Destination cluster allows Argo to deploy to another Kubernetes cluster. Setting the Name to in-cluster will deploy to the cluster that Argo resides.

Once configured you should see your new application. Depending on the sync policy you’ve chosen it will either auto sync and display as Synced or you’ll have to manually sync, in which case it will initial display as OutOfSync as it is yet to be deployed.

After the application has been synced, you can drill down into the UI to display all of the Kubernetes resources along with the Git info and the last sync results.
Monitoring

Now that we are managing an application with ArgoCD, we need visibility for us to effectively monitor the health of the application.
Notifications

There are multiple ways to enable notifications with ArgoCD. Argo CD Notifications is solely focused on Argo CD. It can be configured to notify you in real-time regarding important changes in the application state. You can configure when notifications are sent as well as the notification content.

Argo CD Notifications includes useful triggers and templates. It integrates with various notification services such as Slack, Teams, Telegram, Email, Opsgenie, Mattermsot, Grafana, GitHub and anything else with custom webhooks.

Some other approaches include Prometheus metrics and Grafana Alerts or projects like kubewatch and argo-kube-notifier.
Prometheus Metrics

By default Argo CD exposes two sets of Prometheus metrics, application metrics scraped at the argocd-metrics:8082/metrics endpoint and API server metrics scraped at the argocd-server-metrics:8083/metrics endpoint.
Grafana Dashboards

You can find an example Grafana dashboard here or check out the demo dashboard here.
Conclusion

Every organisation should consider leveraging GitOps to manage their cloud infrastructure. Argo CD brings all of the benefits of GitOps to Kubernetes by following the GitOps approach for defining the application state. Leveraging both of these gives you tremendous power and flexibility.

If you have any questions regarding the benefits of GitOps or the implementation of ArgoCD, feel free to get in touch!
