(function() {
    // utils start
    if (!Object.freeze) {
        Object.freeze = function(obj) {
            var props = Object.getOwnPropertyNames(obj);

            for (var i = 0; i < props.length; i++) {
                var desc = Object.getOwnPropertyDescriptor(obj, props[i]);

                if ("value" in desc) {
                    desc.writable = false;
                }

                desc.configurable = false;
                Object.defineProperty(obj, props[i], desc);
            }

            return Object.preventExtensions(obj);
        };
    }

    var _slice = Array.prototype.slice
    function assign(target, sources) {
        var argumentsLength = arguments.length
        for (var i = 1; i < argumentsLength; i++) {
            var source = arguments[i]
            if (source == null) {
                continue
            }

            for (var propName in source) {
                if (source.hasOwnProperty(propName)) {
                    target[propName] = source[propName]
                }
            }
        }

        return target
    }

    function memoizeString(callback) {
        var cache = {};
        return function(string) {
            if (cache.hasOwnProperty(string)) {
                return cache[string];
            } else {
                return cache[string] = callback.call(this, string);
            }
        };
    }

    var ESCAPES = {
        "&": "&amp;",
        ">": "&gt;",
        "<": "&lt;",
        "\"": "&quot;",
        "'": "&#x27;"
    }

    var ESCAPE_REG = /[&><"']/g

    function safeText(text) {
        return ('' + text).replace(ESCAPE_REG, function(match) {
            return ESCAPES[match]
        })
    }

    var safeText = memoizeString(safeText)

    function createStringForID(id) {
        return 'data-snapid=' + safeText(id)
    }

    function insertChildAt(parentNode, childNode, index) {
        // console.log(parentNode, childNode, index)
        parentNode.insertBefore(
            childNode,
            parentNode.childNodes[index] || null
        )
    }

    function setInnerHTML(node, html) {
        node.innerHTML = html
    }

    function updateTextContent(node, content) {
        var contentKey = 'textContent' in document.documentElement ?
            'textContent' :
            'innerText'

        node[contentKey] = content
    }

    function getComponentKey(component, index) {
        if (component && component.key != null) {
            return '$' + component.key
        }

        return index.toString(36)
    }

    function _traverseCallback(context, child, name) {
        var unique = !context.hasOwnProperty(name)
        if (unique && child != null) {
            var type = typeof child
            var normalized

            if (type === 'string') {
                normalized = SnapTextComponent(child)
            } else if (type === 'number') {
                normalized = SnapTextComponent('' + child)
            } else {
                normalized = child
            }

            context[name] = normalized
        } else {
            throw 'key有冲突'
        }
    }

    function flattenChildren(children) {
        var nameUntilNow = ''
        var indexUntilNow = 0
        var childrenHash = {}

        _traverse(children, nameUntilNow, indexUntilNow, function(child, name) {
            var unique = !childrenHash.hasOwnProperty(name)
            if (unique && child != null) {
                var type = typeof child
                var normalized

                if (type === 'string') {
                    normalized = SnapTextComponent(child)
                } else if (type === 'number') {
                    normalized = SnapTextComponent('' + child)
                } else {
                    normalized = child
                }

                childrenHash[name] = normalized
            } else {
                throw 'key有冲突'
            }
        })
        
        return childrenHash
    }

    function _traverse(children, nameUntilNow, indexUntilNow, callback) {
        var subtreeCount = 0
        var nextName
        var nextIndex
        if (Array.isArray(children)) {
            for (var i = 0, child; child = children[i]; i++) {
                if (nameUntilNow) {
                    nextName = nameUntilNow + ':' + getComponentKey(child, i)
                } else {
                    nextName = '.' + getComponentKey(child, i)
                }
                nextIndex = indexUntilNow + subtreeCount
                subtreeCount += _traverse(
                    child,
                    nextName,
                    nextIndex,
                    callback
                )
            }
        }
        /*
        else if (isObject(children)) {
            
        }
        */
        else {
            var type = typeof children
            var isOnly = (nameUntilNow === '')

            if (isOnly) {
                var storageName = '.' + getComponentKey(children, 0)
            } else {
                var storageName = nameUntilNow
            }

            if (type === 'string' || type === 'number' || SnapElement.isSnapElement(children)) {
                callback(children, storageName)
                subtreeCount = 1
            }
        }

        return subtreeCount
    }

    function shouldUpdate(prevElement, nextElement) {
        if (prevElement && nextElement &&
            prevElement.type === nextElement.type &&
            prevElement.key === nextElement.key &&
            prevElement._owner === nextElement._owner) {
            return true
        } else {
            return false
        }
    }

    // utils end
    var SnapClass = {
        define: function(spec) {
            var Constructor = function(props) {}
            assign(Constructor.prototype, SnapComponent.methods, spec)
            if (spec.getDefaultProps) {
                Constructor.defaultProps = spec.getDefaultProps()
            }
            // var factory = function() {
            //     var args = _slice.call(arguments)
            //     args.unshift(Constructor)
            //     return SnapElement.createElement.apply(null, args) // 返回一个SnapElement实例
            // }

            // factory.type = Constructor
            // return factory 
            return Constructor
        },
        createElement: function(type, props, children) {
            // 下面的转到element里面做
            // if (typeof type !== 'function') {
            //     return SnapElement.createElement.apply(null, arguments) // type: div
            // } else {
            //     return type.apply(null, _slice.call(arguments, 1)) // type: 自定义元素的factory
            //     // return SnapElement.createElement.apply(null, arguments)
            // }

            return SnapElement.createElement.apply(null, arguments)
        }
    }

    var SnapElement = function(type, key, ref, owner, props) {
        this.type = type
        this.key = key
        this.ref = ref
        this._owner = owner

        this._store = {
            props: props
        }

        this.props = props
    }

    SnapElement.prototype = {
        _isSnapElement: true
    }

    SnapElement.createElement = function(type, config, children) {
        var propName
        var props = {}
        var key = null
        var ref = null

        if (type.defaultProps) {
            assign(props, type.defaultProps)
        }

        if (config != null) {
            ref = config.ref === undefined ? null : config.ref
            key = config.key == null ? null : '' + config.key
            for (propName in config) {
                if (config.hasOwnProperty(propName)) {
                    props[propName] = config[propName]
                }
            }
        }

        var childrenLength = arguments.length - 2
        if (childrenLength === 1) {
            props.children = children
        } else if (childrenLength > 1) {
            var childArray = Array(childrenLength)
            for (var i = 0; i < childrenLength; i++) {
                childArray[i] = arguments[i + 2]
            }
            props.children = childArray
        }

        return new SnapElement(
            type,
            key,
            ref,
            SnapCurrentOwner.current,
            props
        )
    }

    SnapElement.cloneWithProps = function(oldElement, newProps) {
        var newElement = new SnapElement(
            oldElement.type,
            oldElement.key,
            oldElement.ref,
            oldElement._owner,
            newProps
        )

        return newElement
    }

    SnapElement.isSnapElement = function(object) {
        return (object && object._isSnapElement)
    }

    var SnapOwner = {
        Mixin: {
            construct: function() {
                this.refs = {}
            }
        }
    }

    var SnapCurrentOwner = {
        current: null
    }

    var _SnapTextComponent = function(props) {}
    assign(_SnapTextComponent.prototype, {
        construct: function(element) {
            this.props = element.props
            this._owner = element._owner
            this._currentElement = element
            this._pendingElement = null
        },
        mountComponent: function(rootId, mountDepth) {
            this._rootNodeID = rootId
            this._mountDepth = mountDepth
            var text = safeText(this.props)
            return '<span ' + createStringForID(rootId) + '>' + safeText(text) + '</span>'
        },
        unmountComponent: function() {
            delete nodeCache[this._rootNodeID]
            this._rootNodeID = null
        },
        receiveComponent: function(nextComponent) {
            var nextProps = nextComponent.props
            if (nextProps !== this.props) {
                this.props = nextProps
                SnapOperations.updateTextContentByID(this._rootNodeID, nextProps)
            }
        }
    })

    var SnapTextComponent = function(text) {
        return new SnapElement(_SnapTextComponent, null, null, null, text)
    }
    SnapTextComponent.type = _SnapTextComponent

    var SnapDomComponent = function(tag) {
        this._tag = tag
        this.tagName = tag.toUpperCase()
    }

    var updateDepth = 0
    var updateQueue = []
    var markupQueue = []

    function enqueueMarkup(parentID, markup, toIndex) {
        updateQueue.push({
            parentID: parentID,
            type: 'insert',
            markupIndex: markupQueue.push(markup) - 1,
            textContent: null,
            fromIndex: null,
            toIndex: toIndex
        })
    }

    function enqueueMove(parentID, fromIndex, toIndex) {
        updateQueue.push({
            parentID: parentID,
            type: 'move',
            markupIndex: null,
            textContent: null,
            fromIndex: fromIndex,
            toIndex: toIndex
        })
    }

    function enqueueRemove(parentID, fromIndex) {
        updateQueue.push({
            parentID: parentID,
            type: 'remove',
            markupIndex: null,
            textContent: null,
            fromIndex: fromIndex,
            toIndex: null
        })
    }

    function enqueueTextContent(parentID, textContent) {
        updateQueue.push({
            parentID: parentID,
            type: 'textContent',
            markupIndex: null,
            textContent: textContent,
            fromIndex: null,
            toIndex: null
        })
    }

    function processQueue() {
        if (updateQueue.length > 0) {
            for (var i = 0; i < updateQueue.length; i++) {
                updateQueue[i].parentNode = SnapMount.getNode(updateQueue[i].parentID)
            }
            
            SnapOperations.processChildrenUpdates(
                updateQueue,
                markupQueue
            )

            clearQueue()
        }
    }

    function clearQueue() {
        updateQueue.length = 0
        markupQueue.length = 0
    }

    var reserveProps = {
        'children': true,
        'key': true,
        'ref': true
    }

    function isReserve(propName) {
        return reserveProps.hasOwnProperty(propName)
    }

    SnapDomComponent.methods = {
        construct: function(element) {
            this.props = element.props
            this._owner = element._owner
            this._currentElement = element
            this._pendingElement = null
        },
        receiveComponent: function(nextElement) {
            if (nextElement === this._currentElement) {
                return
            }

            this._pendingElement = nextElement
            this.performUpdateIfNecessary()
        },
        performUpdateIfNecessary: function() {
            if (this._pendingElement == null) {
                return
            }

            var prevElement = this._currentElement
            var nextElement = this._pendingElement
            this._currentElement = nextElement
            this.props = nextElement.props
            this._owner = nextElement._owner
            this._pendingElement = null
            this.updateComponent(prevElement)
        },
        mountComponent: function(rootId, mountDepth) {
            this._rootNodeID = rootId
            this._mountDepth = mountDepth
            var closeTag = unaryTags[this._tag] ? '' : '</' + this._tag + '>'
            return (
                this._createOpenTagMarkup() +
                this._createContentMarkup() +
                closeTag
            )
        },
        unmountComponent: function() {
            // console.log('unmountComponent:', this._rootNodeID)
            for (var propName in this.props) {
                // console.log(propName, eventTypes, eventTypes[propName])
                /*
                eventTypes[propName] maybe null
                */
                if (eventTypes.hasOwnProperty(propName)) {
                    this.unbindEventListener(propName)
                }
            }
            this.unmountChildren()
            delete nodeCache[this._rootNodeID]
            this._rootNodeID = null
        },
        mountComponentIntoNode: function(rootId, container) {
            SnapComponent.methods.mountComponentIntoNode.call(this, rootId, container)
        },
        bindEventListener: function(eventName, handlerFunc) {
            if (this._owner) {
                handlerFunc = handlerFunc.bind(this._owner)
            }
            SnapEventManager.registerEvent(eventName, this._rootNodeID, handlerFunc)
        },
        unbindEventListener: function(eventName) {
            SnapEventManager.removeEvent(eventName, this._rootNodeID)
        },
        _createOpenTagMarkup: function() {
            var props = this.props
            var ret = '<' + this._tag
            for (var propName in props) {
                if (isReserve(propName)) {
                    continue
                }

                if (eventTypes.hasOwnProperty(propName)) {
                    this.bindEventListener(propName, props[propName])
                    continue
                }

                if (!props.hasOwnProperty(propName)) {
                    continue
                }

                var propValue = props[propName]
                if (propValue == null) {
                    continue
                }

                var markup = propName + '="' + propValue + '"'
                ret += ' ' + markup
            }

            var snapFlag = 'data-snapid="' + this._rootNodeID + '"'
            return ret + ' ' + snapFlag + '>'
        },
        _createContentMarkup: function() {
            var childrenType = typeof this.props.children
            var content = (childrenType === 'string' || childrenType === 'number') ?
                this.props.children : null

            var children = content != null ? null : this.props.children

            if (content != null) {
                return content
            } else if (children != null) {
                var mountImages = this.mountChildren(children)
                return mountImages.join('')
            }

            return ''
        },
        mountChildren: function(nestedChildren) {
            var children = flattenChildren(nestedChildren)
            var mountImages = []
            var index = 0

            this._renderedChildren = children
            for (var name in children) {
                var child = children[name]
                if (children.hasOwnProperty(name)) {
                    var childInstance = initSnapComponent(child)
                    children[name] = childInstance
                    var rootId = this._rootNodeID + name
                    var mountImage = childInstance.mountComponent(
                        rootId,
                        this._mountDepth + 1
                    )
                    childInstance._mountIndex = index
                    mountImages.push(mountImage)
                    index++
                }
            }
            return mountImages
        },
        unmountChildren: function() {
            var renderedChildren = this._renderedChildren
            for (var name in renderedChildren) {
                var renderedChild = renderedChildren[name]

                if (renderedChild.unmountComponent) {
                    renderedChild.unmountComponent()
                }
            }
            this._renderedChildren = null
        },
        updateComponent: function(prevElement) {
            this.updateDomProperties(prevElement.props)
            this.updateDomChildren(prevElement.props)
        },
        updateDomProperties: function(lastProps) {
            var nextProps = this.props
            var propKey

            for (propKey in lastProps) {
                if (nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey)) {
                    continue
                }

                if (!nextProps.hasOwnProperty(propKey)) {
                    if (eventTypes.hasOwnProperty(propKey)) {
                        this.unbindEventListener(propKey)
                    }
                }

                if (isReserve(propKey)) {
                    continue
                }

                SnapOperations.deletePropertyById(
                    this._rootNodeID,
                    propKey
                )
            }

            for (propKey in nextProps) {
                var nextProp = nextProps[propKey]
                var lastProp = lastProps[propKey]

                if (!nextProp || nextProp === lastProp && propKey !== 'value') {
                    continue
                }

                if (isReserve(propKey)) {
                    continue
                }

                if (eventTypes.hasOwnProperty(propKey)) {
                    this.bindEventListener(propKey, nextProps[propKey])
                    continue
                }

                SnapOperations.updatePropertyByID(
                    this._rootNodeID,
                    propKey,
                    nextProp
                )
            }
        },
        updateDomChildren: function(lastProps) {
            var nextProps = this.props
            var type = typeof lastProps.children

            if (type === 'string' || type === 'number') {
                var lastContent = lastProps.children
            } else {
                var lastContent = null
            }

            type = typeof nextProps.children
            if (type === 'string' || type === 'number') {
                var nextContent = nextProps.children
            } else {
                var nextContent = null
            }

            var lastChildren = lastContent != null ? null : lastProps.children
            var nextChildren = nextContent != null ? null : nextProps.children
            var lastHasContent = lastContent != null
            var nextHasContent = nextContent != null

            if (lastChildren != null && nextChildren == null) {
                this.updateChildren(null)
            } else if (lastHasContent && !nextHasContent) {
                this.updateTextContent('')
            }

            if (nextContent != null) {
                if (lastContent !== nextContent) {
                    this.updateTextContent('' + nextContent)
                }
            } else if (nextChildren != null) {
                this.updateChildren(nextChildren)
            }
        },
        updateChildren: function(nextNestedChildren) {
            updateDepth++
            this._updateChildren(nextNestedChildren)
            updateDepth--
            if (!updateDepth) {
                processQueue()
            }
        },
        _updateChildren: function(nextNestedChildren) {
            var nextChildren = flattenChildren(nextNestedChildren)
            var prevChildren = this._renderedChildren

            // console.log('np:', nextNestedChildren, nextChildren, prevChildren)
            if (!nextChildren && !prevChildren) {
                return
            }

            var name
            var lastIndex = 0
            var nextIndex = 0

            for (name in nextChildren) {
                // console.log('name:', name)
                if (!nextChildren.hasOwnProperty(name)) {
                    continue
                }
                var prevChild = prevChildren && prevChildren[name]
                var prevElement = prevChild && prevChild._currentElement; // _currentElement保存Element的引用
                var nextElement = nextChildren[name]

                if (shouldUpdate(prevElement, nextElement)) {
                    this.moveChild(prevChild, nextIndex, lastIndex)
                    lastIndex = Math.max(prevChild._mountIndex, lastIndex)
                    prevChild.receiveComponent(nextElement)
                    prevChild._mountIndex = nextIndex
                } else {
                    if (prevChild) {
                        lastIndex = Math.max(prevChild._mountIndex, lastIndex)
                        this._unmountChildByName(prevChild, name)
                    }

                    var nextChildInstance = initSnapComponent(
                        nextElement,
                        null
                    )
                    this._mountChildByNameAtIndex(
                        nextChildInstance, name, nextIndex
                    )
                }
                nextIndex++
            }

            for (name in prevChildren) {
                if (prevChildren.hasOwnProperty(name) &&
                    !(nextChildren && nextChildren[name])) {
                    this._unmountChildByName(prevChildren[name], name)
                }
            }
        },
        _mountChildByNameAtIndex: function(child, name, index) {
            var rootId = this._rootNodeID + name
            var mountImage = child.mountComponent(
                rootId,
                this._mountDepth + 1
            )
            child._mountIndex = index
            this.createChild(child, mountImage)
            this._renderedChildren = this._renderedChildren || {}
            this._renderedChildren[name] = child
        },
        createChild: function(child, mountImage) {
            enqueueMarkup(this._rootNodeID, mountImage, child._mountIndex)
        },
        moveChild: function(child, toIndex, lastIndex) {
            // console.log('moveChild:', child._mountIndex, lastIndex)
            if (child._mountIndex < lastIndex) {
                enqueueMove(this._rootNodeID, child._mountIndex, toIndex)
            }
        },
        removeChild: function(child) {
            enqueueRemove(this._rootNodeID, child._mountIndex)
        },
        _unmountChildByName: function(child, name) {
            this.removeChild(child)
            child._mountIndex = null
            child.unmountComponent()
            delete this._renderedChildren[name]
        },
        updateTextContent: function(nextContent) {
            /*
            和上面的updateChildren需要一起修改几种未处理的情况
            */
            updateDepth++
            var prevChildren = this._renderedChildren

            for (var name in prevChildren) {
                if (prevChildren.hasOwnProperty(name)) {
                    this._unmountChildByName(prevChildren[name], name)
                }
            }

            this.setTextContent(nextContent)

            updateDepth--
            processQueue()
        },
        setTextContent: function(nextContent) {
            enqueueTextContent(this._rootNodeID, nextContent)
        }
    }

    assign(
        SnapDomComponent.prototype,
        SnapDomComponent.methods
    )

    var SnapComponentBase = function() {}
    SnapComponentBase.methods = {
        mountComponent: function() {
            instancesBySnapId[this._rootNodeID] = this
        },
        unmountComponent: function() {
            delete instancesBySnapId[this._rootNodeID]
        }
    }

    var snapCallbackQueue = function() {
        this.callbacks = null
        this.contexts = null
    }

    snapCallbackQueue.methods = {
        add: function(fn, context) {
            this.callbacks = this.callbacks || []
            this.contexts = this.contexts || []
            this.callbacks.push(fn)
            this.contexts.push(context)
        },
        invokeAll: function() {
            var callbacks = this.callbacks
            var contexts = this.contexts
            if (callbacks) {
                for (var i = 0; i < callbacks.length; i++) {
                    callbacks[i].call(contexts[i])
                }
            }

            this.callbacks = null
            this.contexts = null
        }
    }

    assign(snapCallbackQueue.prototype, snapCallbackQueue.methods)

    var callbackQueue = new snapCallbackQueue
    var SnapComponent = function() {}
    SnapComponent.methods = {
        construct: function(element) {
            this.refs = {}
            this.props = element.props
            this._owner = element._owner
            this._currentElement = element
            this._pendingElement = null

            // console.log('owner is ', this._owner)
        },
        attachRef: function(ref, component) {
            var refs = this.refs === emptyObject ? (this.refs = {}) : this.refs;
            refs[ref] = component;
        },
        getNode: function() {
            return SnapMount.getNode(this._rootNodeID)
        },
        _renderComponent: function() {
            var renderedComponent

            SnapCurrentOwner.current = this
            renderedComponent = this.render()
            SnapCurrentOwner.current = null

            return renderedComponent // SnapElement实例
        },
        mountComponentIntoNode: function(rootId, container) {
            var markup = this.mountComponent(rootId, 0)
            setInnerHTML(container, markup)

            callbackQueue.invokeAll()
        },
        mountComponent: function(rootId, mountDepth) {
            this._rootNodeID = rootId
            this._mountDepth = mountDepth
            this._renderedComponent = initSnapComponent( 
                this._renderComponent(),
                this._currentElement.type
            )

            // console.log('this._renderedComponent is', this._renderedComponent instanceof SnapDomComponent)
            // console.log('this is ', this._renderedComponent instanceof SnapComponent)

            var markup = this._renderedComponent.mountComponent(
                rootId,
                mountDepth + 1
            )

            SnapComponentBase.methods.mountComponent.call(this)
            if (this.afterRender) {
                callbackQueue.add(this.afterRender, this)
            }
            return markup
        },
        unmountComponent: function() {
            this._renderedComponent.unmountComponent()
            this._renderedComponent = null

            SnapComponentBase.methods.unmountComponent.call(this)

            delete nodeCache[this._rootNodeID]
            this._rootNodeID = null
        },
        setProps: function(props) {
            var element = this._pendingElement || this._currentElement
            var props = assign({}, element.props, props)
            this.replaceProps(props)
        },
        replaceProps: function(props) {
            this._pendingElement = SnapElement.cloneWithProps(
                this._pendingElement || this._currentElement,
                props
            )

            SnapUpdates.update(this)
            // this.performUpdateIfNecessary()
        },
        receiveComponent: function(nextElement) {
            if (nextElement === this._currentElement) {
                return
            }
            this._pendingElement = nextElement
            this.performUpdateIfNecessary()
        },
        performUpdateIfNecessary: function() {
            if (this._pendingElement == null) {
                return
            }

            var nextElement = this._pendingElement
            var nextProps = nextElement.props
            this._pendingElement = null
            this._performUpdate(
                nextElement,
                nextProps
            )
        },
        _performUpdate: function(nextElement, nextProps) {
            var prevElement = this._currentElement
            var prevProps = this.props
            this._currentElement = nextElement
            this.props = nextProps
            this._owner = nextElement._owner
            this.updateComponent(
                prevElement
            )
        },
        updateComponent: function(prevElement) {
            var prevRenderedComponent = this._renderedComponent
            var prevElement = prevRenderedComponent._currentElement
            var nextElement = this._renderComponent()

            if (shouldUpdate(prevElement, nextElement)) {
                prevRenderedComponent.receiveComponent(nextElement)
            } else {
                var thisID = this._rootNodeID
                var prevComponentID = prevRenderedComponent._rootNodeID
                prevRenderedComponent.unmountComponent()
                
                this._renderedComponent = initSnapComponent(
                    nextElement,
                    this._currentElement.type
                )

                var nextMarkup = this._renderedComponent.mountComponent(
                    thisID,
                    this._mountDepth + 1
                )

                SnapOperations.replaceNodeByIdWith(
                    prevComponentID,
                    nextMarkup
                )
            }
        },
        forceUpdate: function() {
            this.performUpdateIfNecessary()
        }
    }

    assign(SnapComponent.prototype, SnapComponent.methods)

    var helperNode = document.createElement('div')
    var nodeNamePattern = /^\s*<(\w+)/
    var getNodeName = function(markup) {
        var matches = markup.match(nodeNamePattern)
        return matches && matches[1].toLowerCase()
    }

    var markupWrap = {
        'tr': [2, '<table></tbody>', '</tbody></table>'],
        'td': [3, '<table><tbody><tr>', '</tr></tbody></table>']
    }

    var createNodesFromMarkup = function(markup) {
        // console.log(markup)
        var node = helperNode
        var nodeName = getNodeName(markup)
        var wrap = markupWrap[nodeName]
        if (wrap) {
            node.innerHTML = wrap[1] + markup + wrap[2]
            var wrapDepth = wrap[0]
            while (wrapDepth--) {
                node = node.lastChild
            }
        } else {
            node.innerHTML = markup
        }
        
        var nodes = _slice.call(node.childNodes)
        while (node.lastChild) {
            node.removeChild(node.lastChild)
        }
 
        return nodes
    }
    
    var SnapOperations = {
        replaceNodeByIdWith: function(id, markup) {
            var node = SnapMount.getNode(id)
            var newChild = createNodesFromMarkup(markup)[0]

            node.parentNode.replaceChild(newChild, node)
        },
        updateTextContentByID: function(id, content) {
            var node = SnapMount.getNode(id)
            var contentKey = 'textContent' in document.documentElement ?
                'textContent' :
                'innerText'

            node[contentKey] = content
        },
        deletePropertyById: function(id, name, value) {
            var node = SnapMount.getNode(id)
            node.removeAttribute(name)
        },
        updatePropertyByID: function(id, name, value) {
            // console.log('updatePropertyByID:', value)
            var node = SnapMount.getNode(id)
            if (node.nodeName === 'INPUT' && name === 'value') {
                node.value = value
            } else {
                node.setAttribute(name, value)
            }
        },
        processChildrenUpdates: function(updates, markupList) {
            var update
            var initialChildren = null
            var updatedChildren = null

            for (var i = 0; update = updates[i]; i++) {
                if (update.type === 'move' || update.type === 'remove') {
                    var updatedIndex = update.fromIndex
                    var updatedChild = update.parentNode.childNodes[updatedIndex]
                    var parentID = update.parentID

                    initialChildren = initialChildren || {}
                    initialChildren[parentID] = initialChildren[parentID] || []
                    initialChildren[parentID][updatedIndex] = updatedChild

                    updatedChildren = updatedChildren || []
                    updatedChildren.push(updatedChild)
                }
            }

            var renderedMarkup = SnapMount.renderMarkup(markupList)
            // console.log('renderedMarkup:', renderedMarkup)
            if (updatedChildren) {
                for (var j = 0; j < updatedChildren.length; j++) {
                    updatedChildren[j].parentNode.removeChild(updatedChildren[j])
                }
            }

            for (var k = 0; update = updates[k]; k++) {
                switch (update.type) {
                    case 'insert':
                        insertChildAt(
                            update.parentNode,
                            renderedMarkup[update.markupIndex],
                            update.toIndex
                        )
                        break
                    case 'move':
                        insertChildAt(
                            update.parentNode,
                            initialChildren[update.parentID][update.fromIndex],
                            update.toIndex
                        )
                        break
                    case 'textContent':
                        updateTextContent(
                            update.parentNode,
                            update.textContent
                        )
                        break
                    case 'remove':
                        break
                }
            }
        }
    }

    var unaryTags = {
        'area': true,
        'base': true,
        'br': true,
        'col': true,
        'embed': true,
        'hr': true,
        'img': true,
        'input': true,
        'keygen': true,
        'link': true,
        'meta': true,
        'param': true,
        'source': true,
        'track': true,
        'wbr': true
    }

    var nextSnapRootIndex = 0
    var SnapRootIndex = {
        createSnapRootIndex: function() {
            return nextSnapRootIndex++
        }
    }

    /*
    container->root->element
    */
    var nodeCache = {} // snapid:element hash
    var instancesByRootId = {} // rootId->rootComponent hash
    var instancesBySnapId = {} // snapId->component hash
    var containersByRootId = {} // rootId->container element hash
    var rootElementsByRootId = {} // rootId->root element hash
    var deepestNodeUntilNow = null

    function traverseAncestors(targetID, callback) {
        traverseParentPath('', targetID, callback, true, false)
    }

    function traverseParentPath(start, stop, callback, skipFirst, skipLast) {
        start = start || ''
        stop = stop || ''

        var nextID = isAncestorIDOf(stop, start) ? getParentID : getNextDescendantID
        for (var id = start, ret; ; id = nextID(id, stop)) {
            if ((!skipFirst || id !== start) && (!skipLast || id !== stop)) {
                ret = callback(id)
            }

            if (ret === false || id === stop) {
                break
            }
        }
    }

    function findDeepestAncestorFromCache(targetId) {
        deepestNodeUntilNow = null
        traverseAncestors(targetId, function(ancestorID) {
            var ancestor = nodeCache[ancestorID]
            if (ancestor) {
                deepestNodeUntilNow = ancestor
            } else {
                return false
            }
        })

        var foundNode = deepestNodeUntilNow
        deepestNodeUntilNow = null

        return foundNode
    }

    // 下个字符是点或者id结束位置
    /*
    eg:
    a.b 1 isEdge is true
    a.b 3 isEdge is true
    */
    function isEdge(id, index) {
        var res = (id.charAt(index) === '.' || index === id.length)
        return res
    }

    /*
    返回下一个祖先节点的id
    eg:
    ancestorID = a
    destinationID = a.b.c.d
    nextDescendantID = a.b
    */
    function getNextDescendantID(ancestorID, destinationID) {
        if (ancestorID === destinationID) {
            return ancestorID
        }

        var start = ancestorID.length + 1
        for (var i = start; i < destinationID.length; i++) {
            if (isEdge(destinationID, i)) {
                break
            }
        }

        return destinationID.substr(0, i)
    }

    function isAncestorIDOf(ancestorID, descendantID) {
        // a.b is AncestorID Of a.b.c.d
        return ( descendantID.indexOf(ancestorID) === 0 && isEdge(descendantID, ancestorID.length) )
    }

    function getParentID(id) {
        // a.b is parentID of a.b.c
        return id ? id.substr(0, id.lastIndexOf('.')) : ''
    }

    var SnapInstanceHandles = {
        createRootID: function() {
            var rootId = SnapRootIndex.createSnapRootIndex()
            rootId = '.' + rootId.toString(36)
            return rootId
        },
        createId: function(rootId, name) {
            return rootId + name
        },
        getRootIdOfNodeID: function(id) {
            if (id && 
                id.charAt(0) === '.' && 
                id.length > 1) {
                var index = id.indexOf('.', 1)
                var rootId
                if (index > -1) {
                    rootId = id.substr(0, index)
                } else {
                    rootId = id
                }

                return rootId
            }

            return null
        },
        isAncestorIDOf: isAncestorIDOf
    }

    /**************************** input component **************************************/
    var InputComponent = SnapClass.define({
        render: function() {
            // console.log('InputComponent render fire')
            var ipt = Snap.createElement('input', this.props)

            if (this.props.hasOwnProperty('value') && !this.props.onChange) {
                ipt.props.onChange = this.defaultHandleChange
            }
            
            return ipt
        },
        defaultHandleChange: function(event) {
            if (event.target.value !== this.props.value) {
                this.setProps({
                    value: this.props.value
                })
            }
        }
    })
    /**************************** input component end **************************************/
    
    var predefinedComponents = {
        'input': InputComponent
    }

    var SnapPredefined = {
        createInstance: function(tagName, props, parentType) {
            var componentClass = predefinedComponents[tagName]
            // console.log('createInstance fire', tagName, componentClass)
            if (!componentClass) {
                return new SnapDomComponent(tagName, props)
            }

            // 防止递归
            if (parentType === tagName) {
                if (typeof parentType === 'function') {
                    throw '错误的自定义标签嵌套'
                    return
                }

                return new SnapDomComponent(tagName, props)
            }

            return new componentClass(props)
        }
    }

    /*
    @element SnapElement Instance
    */
    function initSnapComponent(element, parentType) {
        var instance

        if (typeof element.type === 'string') { // eg:'div'
            instance = SnapPredefined.createInstance(element.type, element.props, parentType)
        } else {
            instance = new element.type(element.props) // SnapComponent
        }

        instance.construct(element)
        return instance
    }

    function getRootId(container) {
        var rootElement = SnapMount.getRootElementInContainer(container)
        return rootElement && SnapMount.getID(rootElement)
    }

    var SnapMount = {
        render: function(nextElement, container, callback) {
            var prevComponent = instancesByRootId[getRootId(container)]
            if (prevComponent) {
                var prevElement = prevComponent._currentElement
                if (shouldUpdate(prevElement, nextElement)) {
                    return SnapMount._updateRootComponent(
                        prevComponent,
                        nextElement,
                        container
                    )
                } else {
                    SnapMount.unmountComponentFromContainer(container)
                }
            }

            var component = SnapMount._renderRootComponent(
                nextElement,
                container
            )

            callback && callback(component)
            return component
        },
        unmountComponentFromContainer: function(container) {
            var snapRootId = getRootId(container)
            var component = instancesByRootId[snapRootId]
            if (!component) {
                return false
            }

            component.unmountComponent()
            while (container.lastChild) {
                container.removeChild(container.lastChild)
            }

            delete instancesByRootId[snapRootId]
            delete containersByRootId[snapRootId]
            delete rootElementsByRootId[snapRootId]
            return true
        },
        _registerComponent: function(nextComponent, container) {
            var rootId = SnapMount.registerContainer(container)
            instancesByRootId[rootId] = nextComponent

            return rootId
        },
        registerContainer: function(container) {
            var rootId = SnapMount.getRootId(container)

            if (rootId) {
                rootId = SnapInstanceHandles.getRootIdOfNodeID(rootId)
            }

            if (!rootId) {
                rootId = SnapInstanceHandles.createRootID()
            }

            containersByRootId[rootId] = container
            return rootId
        },
        _renderRootComponent: function(element, container) {
            var componentInstance = initSnapComponent(element)
            var snaprootId = SnapMount._registerComponent(
                componentInstance,
                container
            )

            componentInstance.mountComponentIntoNode(
                snaprootId,
                container
            )

            return componentInstance
        },
        _updateRootComponent: function(prevComponent, nextComponent, container) {
            // console.log('_updateRootComponent fire')
            var nextProps = nextComponent.props
            prevComponent.replaceProps(nextProps)
            rootElementsByRootId[getRootId(container)] = SnapMount.getRootElementInContainer(container)
            return prevComponent
        },
        getRootId: getRootId,
        getRootElementInContainer: function(container) {
            if (!container) {
                return null
            }

            return container.firstChild
        },
        getID: function(node) {
            var id = SnapMount.getSnapId(node)
            if (id) {
                if (nodeCache.hasOwnProperty(id)) {
                    var cached = nodeCache[id]
                    if (cached !== node) {
                        nodeCache[id] = node
                    }
                } else {
                    nodeCache[id] = node
                }
            }
            return id
        },
        getSnapId: function(node) {
            return node && node.getAttribute && node.getAttribute('data-snapid') || ''
        },
        getNode: function(id) {
            if (!nodeCache[id]) {
                nodeCache[id] = this.findNodeById(id)
            }

            return nodeCache[id]
        },
        findNodeById: function(id) {
            var container = this.findContainerForID(id)
            return this.findRootElement(container, id)
        },
        findContainerForID: function(id) {
            var rootId = SnapInstanceHandles.getRootIdOfNodeID(id)
            var container = containersByRootId[rootId]

            var rootElement = rootElementsByRootId[rootId]
            if (rootElement && rootElement.parentNode !== container) {
                var containerChild = container.firstChild
                if (containerChild &&
                    rootId === this.getSnapId(containerChild)) {

                    rootElementsByRootId[rootId] = containerChild
                } else {
                    // root节点从原来的container里删除了
                    throw 'findContainerForID错误'
                }
            }

            return container
        },
        findRootElement: function(ancestorNode, targetID) {
            var firstChildren = []
            var childIndex = 0

            // 先在cache中查找，之后再到domtree中查找
            var deepestAncestor = findDeepestAncestorFromCache(targetID) || ancestorNode

            firstChildren[0] = deepestAncestor.firstChild
            firstChildren.length = 1

            // 遍历dom subtree，查找匹配的节点
            while (childIndex < firstChildren.length) {
                var child = firstChildren[childIndex++]
                var targetChild

                while (child) {
                    var childID = SnapMount.getID(child)
                    if (childID) {
                        /*
                        这个地方已经找到了需要的节点，理论上可以直接返回值，继续循环下去 
                        目的是通过执行getID方法把经过的节点都缓存起来，提高下次调用getNode方法的速度
                        */
                        if (targetID === childID) {
                            targetChild = child
                        } else if (SnapInstanceHandles.isAncestorIDOf(childID, targetID)) {
                            /*
                            如果当前节点是目标节点的祖先，则可以确定只要沿着这个节点向下找即可，
                            其他节点不用管了，所以在这里把队列清空一下，直接把当前节点放进去
                            */
                            firstChildren.length = childIndex = 0
                            firstChildren.push(child.firstChild)
                        }
                    } else {
                        /*
                        如果当前节点没有ID，可能是浏览器在innerHTML执行时候自动插入了某些节点，例如tbody等，
                        这里只是乐观 的把这个分支加入队列，排在Sibling节点之后进行处理
                        */
                        firstChildren.push(child.firstChild)
                    }

                    child = child.nextSibling
                }

                if (targetChild) {
                    /*
                    这里把数组清空有助V8引擎进行GC
                    */
                    firstChildren.length = 0
                    return targetChild
                }
            }

            // 同上，GC
            firstChildren.length = 0
        },
        renderMarkup: function(markupList) {
            var nodeName
            var markupByNodeName = {}

            for (var i = 0; i < markupList.length; i++) {
                nodeName = getNodeName(markupList[i])
                markupByNodeName[nodeName] = markupByNodeName[nodeName] || []
                markupByNodeName[nodeName][i] = markupList[i]
            }

            var resultList = []
            // var resultListAssignmentCount = 0
            for (nodeName in markupByNodeName) {
                var markupListByNodeName = markupByNodeName[nodeName]
                for (var resultIndex in markupListByNodeName) {
                    var markup = markupListByNodeName[resultIndex]
                    markupListByNodeName[resultIndex] = markup.replace(/^(<[^ \/>]+)/, '$1 ' + 'data-index' + '="' + resultIndex + '" ')
                }

                var renderNodes = createNodesFromMarkup(
                    markupListByNodeName.join('')
                )

                for (i = 0; i < renderNodes.length; ++i) {
                    var renderNode = renderNodes[i]
                    if (renderNode.hasAttribute &&
                        renderNode.hasAttribute('data-index')) {

                        resultIndex = +renderNode.getAttribute('data-index')
                        renderNode.removeAttribute('data-index')
                        resultList[resultIndex] = renderNode
                        // resultListAssignmentCount += 1
                    }
                }
            }

            return resultList
        }
    }
    
    // 全局更新标志isUpdating
    var changedComponents = []
    var SnapUpdates = {
        isUpdating: false,
        update: function(component) {
            changedComponents.push(component)
            if (!this.isUpdating) {
                this.isUpdating = true
                this.doUpdate()
                this.isUpdating = false

                // SnapEventManager.processEventQueue()
            }
        },
        doUpdate: function() {
            if (changedComponents.length) {
                // changedComponents.sort(function(c1, c2) {
                //     return c1._mountDepth - c2.mountDepth
                // })

                for (var i = 0, j = changedComponents.length; i < j; i++) {
                    var comp = changedComponents[i]
                    comp.performUpdateIfNecessary()
                }
            }
        }
    }
    

    /************************************* 事件处理 **************************************/
    function removePrefix(eventName) {
        return eventName.replace(/on(\w)/, function(all, match) {
            return match.toLowerCase()
        })
    }

    var eventTypes = {
        onClick: null,
        onMouseover: null,
        onMouseout: null,
        onMousedown: null,
        onMousemove: null,
        onMouseup: null,
        onChange: null,
        onKeyup: null
    }

    // var doc = document.body
    var eventQueue = []
    function addEvent(eventType, listener) {
        if (window.addEventListener) {
            document.body.addEventListener(eventType, listener)
        } else if (window.attachEvent) {
            document.body.attachEvent('on' + eventType, listener)
        }
    }

    function getEventObject(eventObject) {
        return eventObject || window.event
    }

    function normalizeEvent(eventObject) {
        eventObject.target = eventObject.target || eventObject.srcElement
    }

    var SnapEventManager = {
        bindedEvents: {},
        registerEvent: function(eventName, nodeId, listener) {
            // console.log('registerEvent fire:', removePrefix(eventName))
            var self = this
            if (!this.bindedEvents.hasOwnProperty(eventName)) {
                this.bindedEvents[eventName] = {}

                addEvent(removePrefix(eventName), function(eventObject) {
                    self.dispatchEvent(
                        eventName, 
                        getEventObject(eventObject)
                    )
                })
            }

            this.bindedEvents[eventName][nodeId] = listener
            // console.log(this.bindedEvents[eventName])
        },
        removeEvent: function(eventName, dispatchId) {
            // console.log('removeEvent', dispatchId)
            if (this.bindedEvents.hasOwnProperty(eventName)) {
                if (this.bindedEvents[eventName].hasOwnProperty(dispatchId)) {
                    delete this.bindedEvents[eventName][dispatchId]
                }
            }
        },
        dispatchEvent: function(eventName, eventObject) {
            /*
            事件必须在dom更新完后触发，因为之前的listener可能还没有移除，导致错乱
            */
            // console.log('dispatchEvent fire')
            // if (SnapUpdates.isUpdating) {
            //     eventQueue.push([eventName, eventObject])
            // } else {
            //     this.executeListener(eventName, eventObject)
            // }

            normalizeEvent(eventObject)
            this.executeListener(eventName, eventObject)
        },
        /*
        dispatchEvent('click', 'a.b.c', event);
        listeners['a.b.c'](event);
        listeners['a.b'](event);
        listeners['a'](event);
        */
        executeListener: function(eventName, eventObject) {
            var element = eventObject.target
            var snapId = SnapMount.getID(element)
            var listeners = this.bindedEvents[eventName]
            var snapInstance = null

            // 暂时不处理捕获
            var listenerQueue = []
            do {
                // console.log(snapId, listeners[snapId])
                if (listeners.hasOwnProperty(snapId)) {
                    // if (listeners[snapId](eventObject) === false) {
                    //     break
                    // }

                    listenerQueue.push(listeners[snapId])
                }
            } while (snapId = getParentID(snapId))

            /*
            把listener执行和上面的查找分开，是因为listener里面可能会更新bindedListeners，
            令上面的循环发生错乱
            */
            for (var i = 0; i < listenerQueue.length; i++) {
                if (listenerQueue[i](eventObject) === false) {
                    break
                }
            }
        },
        processEventQueue: function() {
            // console.log('processEventQueue', eventQueue.length)
            if (eventQueue.length) {
                for (var i = 0; i < eventQueue.length; i++) {
                    executeListener(eventQueue[0], eventQueue[1])
                }

                eventQueue = []
            }
        }
    }
    /*************************************** 事件处理 end *************************************/

    this.Snap = {
        define: SnapClass.define,
        createElement: SnapClass.createElement,
        render: SnapMount.render
    }
}())