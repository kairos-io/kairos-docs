import * as params from '@params';

function calculateBaseImage(distroInfo) {
    let baseImage = distroInfo[1] + ':' + distroInfo[2];

    if (distroInfo[1] == 'opensuse') {
        baseImage = distroInfo[1] + '/' + distroInfo[2].replace('-', ':');
    } 

    return baseImage;
}

function replaceContent(distroInfo) {
    const preTags = document.querySelectorAll('.meta-distro pre');
    const familyRegex = new RegExp(/\$\$family/, 'gi');
    const flavorRegex = new RegExp(/\$\$flavor/, 'gi');
    const flavorReleaseRegex = new RegExp(/\$\$flavorRelease/, 'gi');
    const baseImageRegex = new RegExp(/\$\$baseImage/, 'gi');

    preTags.forEach(pre => {
        pre.textContent = pre.dataset.originalContent;
        pre.textContent = pre.textContent.replace(familyRegex, distroInfo[0])
                                         .replace(flavorReleaseRegex, distroInfo[2])
                                         .replace(flavorRegex, distroInfo[1])
                                         .replace(baseImageRegex, calculateBaseImage(distroInfo));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const distroSelect = document.getElementById('distro-select');
    let distroInfo = [params.defaultFamily, params.defaultFlavor, params.defaultFlavorRelease];
    const preTags = document.querySelectorAll('.meta-distro pre');
    preTags.forEach(pre => {
        pre.dataset.originalContent = pre.textContent;
    });

    const savedDistro = localStorage.getItem('selectedDistro');
    if (savedDistro) {
        if (distroSelect) {
            distroSelect.value = savedDistro;
        }
        distroInfo = savedDistro.split(';');
    } else {
        if (distroSelect) {
            const defaultDistro = distroInfo.join(';');
            distroSelect.value = defaultDistro;
        }
    }

    replaceContent(distroInfo);

    if (distroSelect) {
        distroSelect.addEventListener('change', () => {
            const selectedDistro = distroSelect.value;
            localStorage.setItem('selectedDistro', selectedDistro);
            replaceContent(selectedDistro.split(';'));
        });
    }
});