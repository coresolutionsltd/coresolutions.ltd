Kubernetes CLI tools to boost your productivity

Knowing each kubectl commands is great knowledge to have, especially when studying to pass the certification exam. However, when troubleshooting issues directly on the CLI, efficient Kubernetes CLI tools to allow you to achieve things faster and easier isn’t a bad thing.

Below is a list of kubernetes cli tools to help install, manage, troubleshoot and use kubernetes on the command line. If you manage kubernetes in any capacity and aren’t using these tools, you should check them out.
Helm

Helm is a package manager for Kubernetes, and Helm Charts are community maintained applications. You can use Helm Charts to manage the installation of your own application. This allows you to contain deployment complexities within the Helm Chart itself and have a simplified deplorable object.
KubeCTX and KubeNS

KubeCTX and KubeNS are super helpful for quickly switching contexts and changing the namespace in use.

Once installed, you can view all contexts with just kubectx and switch to an available context with kubectx <context to switch to>, you can switch to the previous context used with kubectx – and rename contexts with kubectx <new name>=<old name>.

Once you’re in the preferred context you can then set the namespace with kubens <namespace to use by default>. kubens on it’s own will display all available namespaces. It’s nothing groundbreaking, but using these two utilities in tandem can save a lot of time when working with multiple contexts and namespaces.
K9s

K9s is very cool! It allows you to very easily view resources, inspect YAML definitions, view logs, kill pods and more all with a few keystokes. You can also customise the interface by creating your own skin. This could either be a global skin thats applied to all clusters, or set at a cluster level so each cluster will have a different look.

You can find the full list of commands here.
Stern

Stern allows you to tail multiple pods on Kubernetes and multiple containers within the pod. You’ll find that each output is colour coded. This enables faster debugging.
