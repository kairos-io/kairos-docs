import * as params from '@params'
const DOWNLOAD_CARDS_TREE = [
    {
        integration:"ubuntu",
        links: {
            "X86":`https://github.com/kairos-io/provider-kairos/releases/download/${params.kairosVersion}/kairos-ubuntu-${params.kairosVersion}-k3s${params.k3sVersion}.iso`,
            "ARM":`docker pull quay.io/kairos/kairos-ubuntu-arm-rpi-img:${params.kairosVersion}-k3s${params.k3sVersion.replace("+", "-")}`
        }
    },
    {
        integration:"fedora",
        links: {
            "X86":`https://github.com/kairos-io/provider-kairos/releases/download/${params.kairosVersion}/kairos-fedora-${params.kairosVersion}-k3s${params.k3sVersion}.iso`,
            "ARM":"// Temporarily there is no Fedora ARM support, please visit the link below for more information."
        }
    },
    {
        integration:"alpine",
        links: {
            "X86":`https://github.com/kairos-io/provider-kairos/releases/download/${params.kairosVersion}/kairos-alpine-ubuntu-${params.kairosVersion}-k3s${params.k3sVersion}.iso`,
            "ARM":`docker pull quay.io/kairos/core-alpine-arm-rpi:${params.kairosVersion}-k3s${params.k3sVersion.replace("+", "-")}`
        }
    },
      ].map(({integration, links}) => ({
    div: {
        children: [
            {
                div: {
                    children: [
                        {
                            img: {
                                src: `/index/downloads/${integration}.png`,
                                alt: `${integration}.png`
                            }
                        }
                    ]
                }

            },
            {
                div: {
                    children: [
                        ...Object.keys(links).map(type => ({
                            a: {
                                href: type === "X86" ? links[type] : "",
                                class: type === "ARM" ? `open-dialog-${integration}` : "unclickable",
                                children:[
                                    {
                                        span:{
                                            content: type
                                        }
                                    },
                                    {
                                        span:{
                                            content: " version"
                                        }
                                    },
                                    {
                                        img: {
                                            src: `/index/downloads/download.svg`,
                                            alt: "download icon"
                                        }
                                    }
                                ]
                            },
                        })),
                    {
                        dialog: {
                            id: `${integration}-modal`,
                            children: [
                                {
                                    div:{
                                        class: `copied-${integration}`,
                                        content: "Copied"
                                    }
                                },
                                {
                                    p:{
                                        content: "Please use the following docker command: ",
                                        children: [
                                            {
                                                pre:{
                                                    class: `code-${integration}`,
                                                    content: links["ARM"]
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    p:{
                                        content: "You can find more information: ",
                                        children: [
                                            {
                                                a: {
                                                    content: "here",
                                                    href: "https://kairos.io/docs/reference/image_matrix/#image-flavors",
                                                    target: "_blank"
                                                }
                                            }
                                        ]
                                    }
                                },
                                {
                                    div:{
                                        class: "modal-buttons",
                                        children: [
                                            {
                                                button: {
                                                    class: `copy-to-clipboard-${integration}`,
                                                    content: "Copy Command",
                                                }
                                            },
                                            {
                                                button: {
                                                    class: `close-dialog-${integration}`,
                                                    content: "Close",
                                                }
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                    ]
                }
            }
        ]
    }
}))
export const DOWNLOAD_BLADE_TREE = {
    div: {
        class: "download-card-wrap",
        children: [
            {
                div: {
                    class: "download-cards",
                    children: [
                        {
                            div: {
                                content: "Downloads"
                            }
                        }, ...DOWNLOAD_CARDS_TREE
                    ]
            }
            },
            {
                a: {
                    href: "https://kairos.io/docs/reference/image_matrix/#image-flavors",
                    target: "_blank",
                    class: "download-others-link",
                    content: "See other download alternatives",
                    children: [
                        {
                            img: {
                                src: "/index/downloads/arrow-right.svg",
                                alt: "arrow-right"
                            }
                        }
                    ]
                }
            }
        ]
    }
}

export const WELCOME_BLADE_TREE = {
    div: {
        class: "welcome-wrapper",
        children: [
            {
                div:{
                    children: [
                        {
                            img: {
                                src:"/index/wrapped-armadillo.png",
                                alt:"wrapped-armadillo",
                            }
                        }
                    ]
                }
            },
            {
                div:{
                    children: [
                        {
                            h2:{
                                content: "Welcome to &nbsp",
                                children: [
                                    {
                                        img: {
                                            src:"/index/kairos-name-logo.png",
                                            alt: "kairos-name-logo"
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            p: {
                                content: "We're here to make your life easier by turning any Linux distribution into a secure, customizable, and easily managed system for edge computing. <br/><br/> With Kairos, you're not just getting an operating system - you're getting a partner for your edge computing needs."
                            }
                        },
                        {
                            a: {
                                href: "https://www.cncf.io/online-programs/cncf-on-demand-webinar-meet-kairos-an-oss-project-building-the-immutable-kubernetes-edge/",
                                target: "_blank",
                                content: "Watch this CNCF Webinar to meet Kairos",
                                children: [
                                    {
                                        i:{
                                            class: "fa-sharp fa-solid fa-circle-play"
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            }
        ]
    }
}

const HOT_OFF_PRESS_CARDS = [
    {
        content: "See how we're collaborating with Intel and Spectro Cloud on the new Secure Edge-Native Architecture",
        imgSrc: "/index/press-blade/spectro-intel.png",
        link: "https://www.spectrocloud.com/news/spectro-cloud-launches-the-secure-edge-native-architecture-sena",
    },
    {
        content: "Check us out in this The New Stack article by our maintainer, Ettore di Giacinto",
        imgSrc: "/index/press-blade/theNewStack.png",
        link: "https://thenewstack.io/livin-kubernetes-on-the-immutable-edge-with-kairos-project/",
    },
    {
        content: "Learn how to use the famous OSS project, LocalAI, with Kairos and K3s on your nodes",
        imgSrc: "/index/press-blade/k8s-superpowers.png",
        link: "https://thenewstack.io/looking-for-a-k3os-alternative-choosing-a-container-os-for-edge-k8s/",
    },
].map(({content, imgSrc, link}) => ({
    div: {
        children:[
            {
                p: {
                    content
                }
            },
            {
                div: {
                    class: "press-card-img",
                    children: [
                        {
                            img: {
                                src: imgSrc,
                                alt: imgSrc
                            }
                        }
                    ]
                }
            },
            {
                a: {
                    href: link,
                    target: "_blank",
                    content: "Read more",
                    children: [
                        {
                            img: {
                                src: "/index/press-blade/chevronRight.svg",
                                alt: "chevronRight"
                            }
                        }
                    ]
                }
            }
        ]
    }
}))

export const HOT_OFF_PRESS_BLADE = {
    div: {
        class: "hot-off-press",
        children: [
            {
                h2:{
                    content: "Hot off the press"
                }
            },
            {
                div: {
                    class: "press-cards",
                    children: HOT_OFF_PRESS_CARDS
                }
            }
        ]
    }
}

const MAKES_US_DIFF_CARDS = [
    {
        title: "Customizable to Your Needs",
        imgSrc: "/index/makes-diff/swirl.png",
        content: "With Kairos, you're in the driver's seat. Build custom bootable-OS images for your edge devices from your choice of OS and Kubernetes distribution. These images are delivered as container images, and can be customized and extended to your needs. Kairos fits neatly into your CI/CD pipelines and lets you use the container engine of choice."
    },
    {
        title: "Consistent and Secure",
        imgSrc: "/index/makes-diff/security.png",
        content: "Say goodbye to inconsistencies across your clusters with our system's immutability as each node boots from the same image, ensuring uniformity. The system's immutability also reduces the risk of malicious attacks, and with data encryption, your stored data remains protected, providing enhanced security for your clusters."
    },
    {
        title: "Easy <br/> to Onboard",
        imgSrc: "/index/makes-diff/rocket.png",
        content: "We believe in making things simple. With Kairos, you can onboard nodes via QR code, manually, remotely via SSH, interactively, or completely automated with Kubernetes.",
    },
    {
        title: "Kubernetes out <br/> of the box",
        imgSrc: "/index/makes-diff/box.png",
        content: "Kairos supports automatic node provisioning via CRDs; upgrade management via Kubernetes; node repurposing and machine autoscaling; plus complete configuration management via cloud-init."
    },
].map(({title, imgSrc, content})=>({
    div:{
        children: [
            {
                div: {
                    children:[
                        {
                            img: {
                                src: imgSrc,
                                alt: imgSrc
                            }
                        },
                        {
                            h3: {
                                content: title
                            }
                        }
                    ]
                }
            },
            {
                p:{
                    content
                }
            }
        ]
    }
}))

export const MAKES_US_DIFF_BLADE = {
    div: {
        class: "makes-us-diff",
        children: [
            {
                h2:{
                    content: "What makes ",
                    children: [
                        {
                            span: {
                                content:"Kairos "
                            }
                        },
                        {
                            span: {
                                content: "different?"
                            }
                        }
                    ]
                }
            },
            {
                div: {
                    class: "makes-us-diff-cards",
                    children: MAKES_US_DIFF_CARDS
                }
            }
        ]
    }
}

const JOIN_US_CARDS = [
    {
        className: "fa-brands fa-github",
        content: "Contribute to <br/> GitHub",
        href: "https://github.com/kairos-io/kairos"
    },
    {
        className: "fa-solid fa-envelope",
        content: "Sign up to <br/> our newsletter",
        href: "https://kairoslinux.substack.com/p/karios-chronicles-were-part-of-the?sd=pf"
    },
    {
        className: "fa-brands fa-twitter",
        content: "Follow us <br/> on Twitter",
        href: "https://twitter.com/Kairos_OSS"
    },
    {
        className: "fa-brands fa-slack",
        content: "Join our <br/> Slack channel",
        href: "https://spectrocloudcommunity.slack.com/join/shared_invite/zt-g8gfzrhf-cKavsGD_myOh30K24pImLA#/shared-invite/email"
    },
].map(({className, content, href})=>({
    a: {
        href,
        target: "_blank",
        children: [
            {
                i:{
                    class: className,
                }
            },
            {
                div: {
                    children:[
                        {
                            p:{
                                content
                            }
                        }
                    ]
                }

            }
        ]
    }
}))

export const JOIN_US_BLADE = {
    div:{
        class: "join-us-wrap",
        children: [
            {
                h2: {
                    content: "Join our community"
                },
            },
            {
                p: {
                    content: "Whether you're a part of a DevOps team, an IT engineer, a hobbyist, or a maker, we welcome you to join us in driving forward our vision of a secure, decentralized, and containerized edge."
                }
            },
            {
                div: {
                    class: "join-us-wrap-cards",
                    children: JOIN_US_CARDS,
                }
            }
        ]
    }
}

export const BASICS_BLADE = {
    div: {
        class: "basics",
        children: [
            {
                title: "Installation",
                imgSrc: "/index/basics/opened-box.png",
                text: "See how to get up and running with Kairos, in less than 15 minutes!",
                href: "https://kairos.io/docs/installation/"
            },
            {
                title: "Architecture",
                imgSrc: "/index/basics/shell.png",
                text: "Get inside Kairos, from the factory <br/> to P2P mesh capabilities.",
                href: "https://kairos.io/docs/architecture/"
            },
            {
                title: "Examples",
                imgSrc: "/index/basics/origami-bird.png",
                text: "Stretch your wings with best practices of common tasks after installing Kairos.",
                href: "https://github.com/kairos-io/kairos/tree/master/examples"
            },
        ].map(({title, imgSrc, text, href})=>({
            a:{
                href,
                target: "_blank",
                children: [
                    {
                        img: {
                            src: imgSrc,
                            alt: imgSrc
                        }
                    },
                    {
                        div: {
                            children: [
                                {
                                    h3:{
                                        content: title
                                    }
                                },
                                {
                                    p:{
                                        content: text
                                    }
                                },
                                {
                                    img: {
                                        src:"/index/basics/arrowRight.png",
                                        alt: "Arrow Right"
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }))
    }
}

export const FOOTER_TREE = {
    div:{
        children: [
            {
                div:{
                    class: "footer-logo",
                    children:[
                        {
                            img: {
                                src:"/index/footer-logo.png",
                                alt:"Kairos Logo"
                            }
                        },
                        {
                            div:{
                                class: "footer-text",
                                content: "Project supported by ",
                                children: [
                                    {
                                        span: {
                                            content: " Spectro Cloud"
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            },
            {
                div:{
                    content: "Follow us",
                    class: "footer-follow-us",
                    children: [
                        {
                            div: {
                            children:[
                                {
                                    href: "https://twitter.com/Kairos_OSS",
                                    className: "fa-brands fa-square-twitter"
                                },
                                {
                                    href: "https://github.com/kairos-io/kairos",
                                    className: "fa-brands fa-square-github"
                                },
                                {
                                    href: "https://www.youtube.com/@kairos_oss",
                                    className: "fa-brands fa-square-youtube"
                                }
                            ].map(({href, className})=>({
                                a: {
                                    href,
                                    target: "_blank",
                                    children: [
                                        {
                                            i:{
                                                class:className
                                            }
                                        }
                                    ]
                                }
                            }))}
                        }
                    ]
                }
            }
        ]
    }
}
