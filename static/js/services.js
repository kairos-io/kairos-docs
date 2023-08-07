const HTML_TAGS = ["h1", "h2", "h3", "h4" ,"div", "p" ,"span", "a", "img" ,"i"]

export function renderHTMLTree(dataTree = {}, rootElem){
    Object.keys(dataTree).forEach(treeKey => {
        let elem = null

        if (HTML_TAGS.includes(treeKey)){
            elem = document.createElement(treeKey)
            if(treeKey === "img"){
                elem.src = dataTree[treeKey].src
                elem.alt = dataTree[treeKey].alt
                elem.loading = "lazy"
            }

            if(treeKey === "a"){
                elem.href = dataTree[treeKey].href
                elem.target = dataTree[treeKey]?.target || "_self"
            }

            rootElem.appendChild(elem)
        }

        if (Object.hasOwn(dataTree[treeKey], "class")){
            dataTree[treeKey].class.split(" ").forEach(classString => elem.classList.add(classString))
        }

        if (Object.hasOwn(dataTree[treeKey], "content")){
            elem.innerHTML = dataTree[treeKey].content
        }

        if (Object.hasOwn(dataTree[treeKey], "children")){
            dataTree[treeKey].children.forEach((childTree)=>renderHTMLTree(childTree, elem))
        }

    })
}
