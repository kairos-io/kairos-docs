import { renderHTMLTree } from "/js/services.js"
import {
    DOWNLOAD_BLADE_TREE,
    WELCOME_BLADE_TREE,
    HOT_OFF_PRESS_BLADE,
    MAKES_US_DIFF_BLADE,
    JOIN_US_BLADE,
    BASICS_BLADE,
    FOOTER_TREE
} from "/js/trees.js"

const BLADES = [
    {
        id: "download-blade",
        tree: DOWNLOAD_BLADE_TREE,
    },
    {
        id: "welcome-blade",
        tree: WELCOME_BLADE_TREE,
    },
    {
        id: "hot-press-blade",
        tree: HOT_OFF_PRESS_BLADE,
    },
    {
        id: "makes-us-diff-blade",
        tree: MAKES_US_DIFF_BLADE,
    },
    {
        id:"join-us-blade",
        tree: JOIN_US_BLADE,
    },
    {
        id:"basics-blade",
        tree: BASICS_BLADE,
    },
    {
        id: "footer-content",
        tree: FOOTER_TREE,
    }
]


BLADES.forEach(({id, tree})=> {
    const rootElem = document.getElementById(id)
    renderHTMLTree(tree, rootElem)
})

const INTEGRATIONS = ["ubuntu", "fedora", "alpine"]

INTEGRATIONS.forEach(integration => {
    const modal = document.querySelector(`#${integration}-modal`)
    const openModalButton = document.querySelector(`.open-dialog-${integration}`)
    const closeModalButton = document.querySelector(`.close-dialog-${integration}`)
    const copyToClipboardButton = document.querySelector(`.copy-to-clipboard-${integration}`,)
    const codeToCopy = document.querySelector(`.code-${integration}`)
    const copiedNotification = document.querySelector(`.copied-${integration}`)

    copyToClipboardButton.addEventListener("click", (e) => {
        if(!codeToCopy.innerHTML){
            return
        }
        e.preventDefault();
        navigator.clipboard.writeText(codeToCopy.innerHTML)
        copiedNotification.style.setProperty("display", "block");
    });

    openModalButton.addEventListener("click", (e) => {
        e.preventDefault();
        modal.showModal();
    });

    closeModalButton.addEventListener("click", (e) => {
        e.preventDefault();
        modal.close()
        copiedNotification.style.setProperty("display", "none");
    });

})
