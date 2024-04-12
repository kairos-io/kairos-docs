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
