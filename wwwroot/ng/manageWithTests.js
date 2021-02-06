var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var armExplorer;
(function (armExplorer) {
    angular.module("armExplorer", ["ngRoute", "ngAnimate", "ngSanitize", "ui.bootstrap", "angularBootstrapNavTree", "rx", "mp.resizer", "ui.ace"])
        .controller("treeBodyController", ["$scope", "$routeParams", "$location", "$http", "$timeout", "rx", "$document", ($scope, $routeParams, $location, $http, $timeout, rx, $document) => {
            $scope.treeControl = {};
            $scope.createModel = {};
            $scope.actionsModel = {};
            $scope.resources = [];
            $scope.readOnlyMode = true;
            $scope.editMode = false;
            $scope.treeBranchDataOverrides = ClientConfig.treeBranchDataOverrides;
            $scope.aceConfig = ClientConfig.aceConfig;
            const activeTab = [false, false, false, false, false];
            $timeout(() => {
                $scope.editorCollection = new EditorCollection();
                $scope.editorCollection.configureEditors();
            });
            $document.on('mouseup', () => { $timeout(() => { $scope.editorCollection.apply(e => { e.resize(); }); }); });
            $scope.$createObservableFunction("selectResourceHandler")
                .flatMapLatest((args) => {
                var branch = args[0];
                var event = args[1];
                $scope.loading = true;
                delete $scope.errorResponse;
                if (branch.is_instruction) {
                    var parent = $scope.treeControl.get_parent_branch(branch);
                    $scope.treeControl.collapse_branch(parent);
                    $timeout(() => {
                        $scope.expandResourceHandler(parent, undefined, undefined, undefined, true);
                        $scope.treeControl.select_branch(parent);
                    });
                }
                const resourceDefinition = branch.resourceDefinition;
                if (resourceDefinition) {
                    const getHttpConfig = branch.getGetHttpConfig();
                    if (getHttpConfig) {
                        return rx.Observable.fromPromise($http(getHttpConfig))
                            .map(data => { return { resourceDefinition: resourceDefinition, data: data.data, url: getHttpConfig.data.Url, branch: branch, httpMethod: getHttpConfig.data.HttpMethod }; })
                            .catch(error => rx.Observable.of({ error: error }));
                    }
                    else {
                        return rx.Observable.of({ branch: branch, resourceDefinition: resourceDefinition });
                    }
                }
                else {
                    return rx.Observable.fromPromise(Promise.resolve({ branch: branch }));
                }
            })
                .subscribe((value) => {
                if (value.error) {
                    var error = value.error;
                    setStateForErrorOnResourceClick();
                    let apiVersion = "";
                    let url = "";
                    if (error.config && error.config.resourceDefinition) {
                        url = error.config.filledInUrl;
                        $scope.editorCollection.setValue(Editor.ResponseEditor, "");
                        $scope.readOnlyResponse = "";
                        apiVersion = error.config.resourceDefinition.apiVersion;
                    }
                    $scope.errorResponse = StringUtils.syntaxHighlight({ data: error.data, status: error.status });
                    $scope.selectedResource = {
                        url: url,
                        actionsAndVerbs: [],
                        httpMethods: ["GET"],
                        doc: [],
                        apiVersion: apiVersion,
                        putUrl: url
                    };
                }
                else {
                    setStateForClickOnResource();
                    if (value.data === undefined) {
                        if (value.resourceDefinition && value.resourceDefinition.hasRequestBody()) {
                            $scope.editorCollection.setValue(Editor.ResponseEditor, StringUtils.stringify(value.resourceDefinition.requestBody));
                        }
                        else {
                            $scope.editorCollection.setValue(Editor.ResponseEditor, StringUtils.stringify({ message: "No GET Url" }));
                            $scope.editorCollection.setValue(Editor.PowershellEditor, "");
                            $scope.editorCollection.setValue(Editor.AnsibleEditor, "");
                            $scope.editorCollection.setValue(Editor.AzureCliEditor, "");
                        }
                    }
                    else {
                        var resourceDefinition = value.resourceDefinition;
                        var url = value.url;
                        var putUrl = url;
                        if (resourceDefinition.hasPutOrPatchAction()) {
                            let editable = resourceDefinition.getEditable(value.data);
                            $scope.editorCollection.setValue(Editor.RequestEditor, StringUtils.stringify(ObjectUtils.sortByObject(editable, value.data)));
                            if (url.endsWith("list")) {
                                putUrl = url.substring(0, url.lastIndexOf("/"));
                            }
                        }
                        else {
                            $scope.editorCollection.setValue(Editor.RequestEditor, "");
                        }
                        $scope.editorCollection.setValue(Editor.ResponseEditor, StringUtils.stringify(value.data));
                        enableCreateEditorIfRequired(resourceDefinition);
                        let actionsAndVerbs = $scope.resourceDefinitionsCollection.getActionsAndVerbs(value.branch);
                        let doc = resourceDefinition.getDocBody();
                        let docArray = DocumentationGenerator.getDocumentationFlatArray(value.data, doc);
                        $scope.selectedResource = {
                            url: StringUtils.selectiveUrlencode(url),
                            actionsAndVerbs: actionsAndVerbs,
                            httpMethods: resourceDefinition.actions.filter(e => e !== "DELETE" && e !== "CREATE").map((e) => (e === "GETPOST" ? "POST" : e)).sort(),
                            doc: docArray,
                            apiVersion: resourceDefinition.apiVersion,
                            putUrl: putUrl
                        };
                        $location.path(url.replace(/https:\/\/[^\/]*\//, ""));
                        $scope.editorCollection.setValue(Editor.AzureCliEditor, armExplorer.getAzureCliScriptsForResource(value));
                        $scope.editorCollection.setValue(Editor.PowershellEditor, armExplorer.getPowerShellScriptsForResource(value, actionsAndVerbs));
                        $scope.editorCollection.setValue(Editor.AnsibleEditor, armExplorer.getAnsibleScriptsForResource(value, actionsAndVerbs, resourceDefinition));
                    }
                }
                fixActiveEditor();
            });
            function enableCreateEditorIfRequired(resourceDefinition) {
                if (resourceDefinition.hasCreateAction()) {
                    $scope.creatable = true;
                    $scope.createMetaData = resourceDefinition.requestBody;
                    $scope.editorCollection.setValue(Editor.CreateEditor, StringUtils.stringify(resourceDefinition.requestBody));
                }
            }
            function fixActiveEditor() {
                const activeIndex = activeTab.indexOf(true);
                if ((!$scope.creatable && activeIndex === Editor.CreateEditor) ||
                    (!($scope.selectedResource && $scope.selectedResource.actionsAndVerbs &&
                        $scope.selectedResource.actionsAndVerbs.length > 0) && activeIndex === Editor.RequestEditor)) {
                    $timeout(() => { activeTab[Editor.ResponseEditor] = true; });
                }
            }
            $scope.handleClick = (selectedResource, method, event) => {
                if (method === "PUT" || method === "PATCH") {
                    const action = new Action(method, "", "");
                    invokePutOrPatch(selectedResource, action, event);
                }
                else {
                    refreshContent();
                }
            };
            $scope.invokeAction = (selectedResource, action, event) => {
                doInvokeAction(selectedResource, action, event);
            };
            function invokePutFinallyCallback() {
                $timeout(() => { $scope.invoking = false; $scope.loading = false; });
            }
            function invokePutErrorCallback(response) {
                $timeout(() => { $scope.putError = response.data ? StringUtils.syntaxHighlight(response.data) : StringUtils.syntaxHighlight(response.message); });
                ExplorerScreen.fadeInAndFadeOutError();
            }
            function finalizePut() {
                $timeout(() => {
                    $scope.selectResourceHandler($scope.treeControl.get_selected_branch(), undefined);
                    ExplorerScreen.fadeInAndFadeOutSuccess();
                });
            }
            function invokePutOrPatch(selectedResource, action, event) {
                return __awaiter(this, void 0, void 0, function* () {
                    setStateForInvokePut();
                    if ($scope.readOnlyMode) {
                        if (!action.isGetAction()) {
                            ExplorerScreen.showReadOnlyConfirmation(event);
                        }
                    }
                    else {
                        const repository = new ArmClientRepository($http);
                        try {
                            yield repository.invokePut(selectedResource, action, $scope.editorCollection);
                            finalizePut();
                        }
                        catch (error) {
                            invokePutErrorCallback(error);
                        }
                        finally {
                            invokePutFinallyCallback();
                        }
                    }
                    return Promise.resolve().then(invokePutFinallyCallback);
                });
            }
            ;
            function keepChildPredicate(childName, resourceDefinition, dontFilterEmpty, branch, providersFilter) {
                const childDefinition = $scope.resourceDefinitionsCollection.getResourceDefinitionByNameAndUrl(childName, resourceDefinition.url + "/" + childName);
                let keepChild = false;
                if (childDefinition && (childDefinition.children || !childDefinition.hasPostAction())) {
                    if (dontFilterEmpty) {
                        keepChild = true;
                    }
                    else {
                        keepChild = keepChildrenBasedOnExistingResources(branch, childName, providersFilter);
                    }
                }
                return keepChild;
            }
            function getSubscriptionBranch(branch) {
                if (!branch || isItemOf(branch, "subscriptions")) {
                    return branch;
                }
                else {
                    return getSubscriptionBranch($scope.treeControl.get_parent_branch(branch));
                }
            }
            function getProvidersForBranch(branch) {
                return __awaiter(this, void 0, void 0, function* () {
                    let providers = undefined;
                    const subscriptionBranch = getSubscriptionBranch(branch);
                    if (subscriptionBranch) {
                        const repository = new ArmClientRepository($http);
                        const subscriptionsResponse = yield repository.getProvidersForSubscription(subscriptionBranch.value);
                        providers = subscriptionsResponse.data;
                    }
                    return providers;
                });
            }
            $scope.expandResourceHandler = (branch, row, event, dontExpandChildren, dontFilterEmpty) => __awaiter(this, void 0, void 0, function* () {
                if (branch.is_leaf)
                    return Promise.resolve();
                if (branch.expanded) {
                    branch.children.length = 0;
                    $timeout(() => { $scope.treeControl.collapse_branch(branch); });
                    return Promise.resolve();
                }
                var resourceDefinition = branch.resourceDefinition;
                if (!resourceDefinition)
                    return Promise.resolve();
                const children = resourceDefinition.children;
                if (typeof children !== "string" && Array.isArray(children)) {
                    try {
                        const originalTreeIcon = showExpandingTreeItemIcon(row, branch);
                        const providersFilter = yield getProvidersForBranch(branch);
                        const filteredChildren = children.filter((child) => {
                            return keepChildPredicate(child, resourceDefinition, dontFilterEmpty, branch, providersFilter);
                        });
                        const isListFiltered = filteredChildren.length !== children.length;
                        branch.children = filteredChildren.map((childName) => {
                            const childDefinition = $scope.resourceDefinitionsCollection.getResourceDefinitionByNameAndUrl(childName, resourceDefinition.url + "/" + childName);
                            const newTreeBranch = new TreeBranch(childName);
                            newTreeBranch.resourceDefinition = childDefinition;
                            newTreeBranch.is_leaf = (childDefinition.children ? false : true);
                            newTreeBranch.elementUrl = branch.elementUrl + "/" + childName;
                            newTreeBranch.sortValue = childName;
                            newTreeBranch.iconNameOverride = null;
                            return newTreeBranch;
                        });
                        endExpandingTreeItem(branch, originalTreeIcon);
                        var offset = 0;
                        if (!dontFilterEmpty && isListFiltered) {
                            var parent = $scope.treeControl.get_parent_branch(branch);
                            if (branch.label === "providers" || (parent && parent.currentResourceGroupProviders)) {
                                const showAllTreeBranch = new TreeBranch("Show all");
                                showAllTreeBranch.is_instruction = true;
                                showAllTreeBranch.resourceDefinition = resourceDefinition;
                                showAllTreeBranch.sortValue = null;
                                showAllTreeBranch.iconNameOverride = null;
                                branch.children.unshift(showAllTreeBranch);
                                offset++;
                            }
                        }
                        $timeout(() => { $scope.treeControl.expand_branch(branch); });
                        if ((branch.children.length - offset) === 1 && !dontExpandChildren) {
                            $timeout(() => { $scope.expandResourceHandler($scope.treeControl.get_first_non_instruction_child(branch)); });
                        }
                    }
                    catch (error) {
                        console.log(error);
                    }
                }
                else if (typeof children === "string") {
                    var getUrl = branch.elementUrl;
                    var originalIcon = showExpandingTreeItemIcon(row, branch);
                    var httpConfig = (getUrl.endsWith("resourceGroups") || getUrl.endsWith("subscriptions") || getUrl.split("/").length === 3)
                        ? {
                            method: "GET",
                            url: `api${getUrl.substring(getUrl.indexOf("/subscriptions"))}`
                        }
                        : {
                            method: "POST",
                            url: "api/operations",
                            data: {
                                Url: getUrl,
                                HttpMethod: "GET",
                                ApiVersion: resourceDefinition.apiVersion
                            }
                        };
                    try {
                        const repository = new ArmClientRepository($http);
                        const httpResponse = yield repository.invokeHttp(httpConfig);
                        const data = httpResponse.data;
                        var childDefinition = $scope.resourceDefinitionsCollection.getResourceDefinitionByNameAndUrl(children, resourceDefinition.url + "/" + resourceDefinition.children);
                        var treeBranchProjection = getTreeBranchProjection(childDefinition);
                        branch.children = (data.value ? data.value : data).map((d) => {
                            var csmName = getCsmNameFromIdAndName(d.id, d.name);
                            var label = treeBranchProjection.getLabel(d, csmName);
                            const treeBranch = new TreeBranch(label);
                            treeBranch.resourceDefinition = childDefinition;
                            treeBranch.value = (d.subscriptionId ? d.subscriptionId : csmName);
                            treeBranch.is_leaf = (childDefinition.children ? false : true);
                            treeBranch.elementUrl = branch.elementUrl + "/" + (d.subscriptionId ? d.subscriptionId : csmName);
                            treeBranch.sortValue = treeBranchProjection.getSortKey(d, label);
                            treeBranch.iconNameOverride = treeBranchProjection.getIconNameOverride(d);
                            return treeBranch;
                        }).sort((a, b) => {
                            return a.sortValue.localeCompare(b.sortValue) * treeBranchProjection.sortOrder;
                        });
                    }
                    catch (err) {
                        console.log(err);
                    }
                    finally {
                        endExpandingTreeItem(branch, originalIcon);
                        $timeout(() => { $scope.treeControl.expand_branch(branch); });
                        if (branch.children && branch.children.length === 1 && !dontExpandChildren) {
                            $timeout(() => { $scope.expandResourceHandler($scope.treeControl.get_first_child(branch)); });
                        }
                    }
                }
                return Promise.resolve();
            });
            function keepChildrenBasedOnExistingResources(branch, childName, providersFilter) {
                const parent = $scope.treeControl.get_parent_branch(branch);
                let keepChild = true;
                if (branch.label === "providers") {
                    if (providersFilter) {
                        const currentResourceGroup = (parent && isItemOf(parent, "resourceGroups") ? parent.label : undefined);
                        if (currentResourceGroup) {
                            const currentResourceGroupProviders = providersFilter[currentResourceGroup.toUpperCase()];
                            if (currentResourceGroupProviders) {
                                branch.currentResourceGroupProviders = currentResourceGroupProviders;
                                keepChild = (currentResourceGroupProviders[childName.toUpperCase()] ? true : false);
                            }
                            else {
                                keepChild = false;
                            }
                        }
                    }
                }
                else if (parent && parent.currentResourceGroupProviders) {
                    keepChild = parent.currentResourceGroupProviders[branch.label.toUpperCase()] &&
                        parent.currentResourceGroupProviders[branch.label.toUpperCase()].some((c) => c.toUpperCase() === childName.toUpperCase());
                }
                return keepChild;
            }
            $scope.tenantSelect = () => {
                window.location.href = "api/tenants/" + $scope.selectedTenant.id;
            };
            $scope.$createObservableFunction("delayResourceSearch")
                .flatMapLatest((event) => {
                return $timeout(() => { return event; }, 300);
            }).subscribe((event) => {
                if (!event || event.keyCode !== 13) {
                    $scope.resourceSearcher.resourceSearch();
                }
            });
            $scope.selectResourceSearch = (item) => {
                var itemId = item.id;
                var currentSelectedBranch = $scope.treeControl.get_selected_branch();
                if (currentSelectedBranch) {
                    const commonAncestor = $scope.treeControl.get_selected_branch().getCommonAncestorBranch(item.id);
                    while (currentSelectedBranch != null && !currentSelectedBranch.elementUrl.toLowerCase().endsWith(commonAncestor)) {
                        currentSelectedBranch = $scope.treeControl.get_parent_branch(currentSelectedBranch);
                    }
                    if (currentSelectedBranch) {
                        $scope.treeControl.select_branch(currentSelectedBranch);
                        const subscriptionTokenIndex = currentSelectedBranch.elementUrl.toLowerCase().indexOf("/subscriptions");
                        const currentSelectedBranchPath = currentSelectedBranch.elementUrl.substr(subscriptionTokenIndex);
                        itemId = itemId.substr(currentSelectedBranchPath.length);
                    }
                    else {
                        $scope.treeControl.collapse_all();
                    }
                }
                handlePath(itemId.substr(1));
                $scope.resourceSearchModel.turnOffSuggestions();
            };
            $scope.enterCreateMode = () => {
                $scope.createMode = true;
                $scope.editorCollection.resize(Editor.CreateEditor);
                delete $scope.createModel.createdResourceName;
            };
            $scope.leaveCreateMode = () => {
                $scope.createMode = false;
                $scope.editorCollection.resize(Editor.ResponseEditor);
                $scope.editorCollection.resize(Editor.RequestEditor);
            };
            $scope.clearCreate = () => {
                delete $scope.createModel.createdResourceName;
                $scope.editorCollection.setValue(Editor.CreateEditor, StringUtils.stringify($scope.createMetaData));
            };
            function finalizeCreate() {
                const selectedBranch = $scope.treeControl.get_selected_branch();
                $timeout(() => { $scope.treeControl.collapse_branch(selectedBranch); });
                if (selectedBranch.uid === $scope.treeControl.get_selected_branch().uid) {
                    $timeout(() => { $scope.selectResourceHandler($scope.treeControl.get_selected_branch(), undefined); });
                    ExplorerScreen.fadeInAndFadeOutSuccess();
                }
                $timeout(() => { $scope.expandResourceHandler(selectedBranch); }, 50);
            }
            function invokeCreateErrorCallback(response) {
                $timeout(() => { $scope.createError = response.data ? StringUtils.syntaxHighlight(response.data) : StringUtils.syntaxHighlight(response.message); });
                ExplorerScreen.fadeInAndFadeOutError();
            }
            function invokeCreateFinallyCallback() {
                $timeout(() => { $scope.invoking = false; $scope.loading = false; });
            }
            function setStateForInvokeCreate() {
                delete $scope.createError;
                $scope.invoking = true;
            }
            function doInvokeCreate(selectedResource, event) {
                return __awaiter(this, void 0, void 0, function* () {
                    const resourceName = $scope.createModel.createdResourceName;
                    if (resourceName) {
                        setStateForInvokeCreate();
                        const action = new Action("PUT", "", "");
                        if ($scope.readOnlyMode) {
                            if (!action.isGetAction()) {
                                ExplorerScreen.showReadOnlyConfirmation(event);
                            }
                        }
                        else {
                            const repository = new ArmClientRepository($http);
                            try {
                                yield repository.invokeCreate(resourceName, selectedResource, action, $scope.editorCollection);
                                finalizeCreate();
                            }
                            catch (error) {
                                invokeCreateErrorCallback(error);
                            }
                            finally {
                                invokeCreateFinallyCallback();
                            }
                        }
                    }
                    else {
                        invokeCreateErrorCallback({ message: "{Resource Name} can't be empty" });
                    }
                    return Promise.resolve().then(invokeCreateFinallyCallback);
                });
            }
            $scope.invokeCreate = (selectedResource, event) => {
                doInvokeCreate(selectedResource, event);
            };
            function refreshContent() {
                $scope.selectResourceHandler($scope.treeControl.get_selected_branch(), undefined);
            }
            ;
            $scope.enterDataTab = () => {
                if ($scope.editorCollection) {
                    $scope.editorCollection.resize(Editor.ResponseEditor);
                    $scope.editorCollection.resize(Editor.RequestEditor);
                }
            };
            $scope.hideDocs = () => {
                var newWidth = $("#doc").outerWidth(true) + $("#content").outerWidth(true);
                $("#content").css({ width: newWidth });
                $("#doc").hide();
                $("#doc-resizer").hide();
                $("#show-doc-btn").show();
            };
            $scope.showDocs = () => {
                $("#doc").show();
                $("#doc-resizer").show();
                var newWidth = $("#content").outerWidth(true) - $("#doc").outerWidth(true);
                $("#content").css({ width: newWidth });
                $("#show-doc-btn").hide();
            };
            $scope.hideConfirm = () => {
                $(".confirm-box").fadeOut(300);
                $('#dark-blocker').hide();
            };
            $scope.setReadOnlyMode = (readOnlyMode) => {
                $scope.readOnlyMode = readOnlyMode;
                $.cookie("readOnlyMode", readOnlyMode, { expires: 10 * 365, path: '/' });
            };
            $scope.toggleEditMode = () => {
                $scope.editMode = !$scope.editMode;
                $timeout(() => {
                    try {
                        $scope.editorCollection.resize(Editor.ResponseEditor);
                        $scope.editorCollection.resize(Editor.RequestEditor);
                    }
                    catch (error) {
                        console.log(error);
                    }
                });
            };
            $scope.showHttpVerb = (verb) => {
                return ((verb === "GET" || verb === "POST") && !$scope.editMode) || ((verb === "PUT" || verb === "PATCH") && $scope.editMode);
            };
            $scope.logout = () => {
                window.location.href = "/logout";
            };
            $scope.refresh = () => {
                window.location.href = "/";
            };
            $scope.copyResUrlToClipboard = (text) => {
                var textField = document.createElement('textarea');
                textField.innerText = text;
                document.body.appendChild(textField);
                textField.select();
                if (document.execCommand('copy')) {
                    $scope.resUrlColor = '#718c00';
                    $timeout(function () {
                        $scope.resUrlColor = '#000';
                    }, 350);
                }
                else {
                    console.error("document.execCommand('copy') returned false. " +
                        "Your browser may not support this feature or clipboard permissions don't allow it. " +
                        "See http://caniuse.com/#feat=document-execcommand.");
                }
                textField.remove();
            };
            initResourcesDefinitions();
            initTenants();
            initSettings();
            initUser();
            initResourceSearch();
            function initResourceSearch() {
                const repository = new ArmClientRepository($http);
                $scope.resourceSearchModel = new ResourceSearchDataModel();
                $scope.resourceSearcher = new ResourceSearcher($scope.resourceSearchModel, repository);
                $("body").click(event => {
                    if (event && event.target
                        && event.target.getAttribute("id") !== "resource-search-input"
                        && !$.contains($("#resource-search-input")[0], event.target)
                        && event.target.getAttribute("id") !== "resource-search-list"
                        && !$.contains($("#resource-search-list")[0], event.target)) {
                        $scope.resourceSearchModel.turnOffSuggestions();
                    }
                });
            }
            ;
            function initUser() {
                return __awaiter(this, void 0, void 0, function* () {
                    let currentUser;
                    try {
                        const repository = new ArmClientRepository($http);
                        const userTokenResponse = yield repository.getUserToken();
                        const userToken = userTokenResponse.data;
                        currentUser = {
                            name: (userToken.given_name && userToken.family_name ? userToken.given_name + " " + userToken.family_name : undefined) || userToken.name || userToken.email || userToken.unique_name || "User",
                            imageUrl: "https://secure.gravatar.com/avatar/" + CryptoJS.MD5((userToken.email || userToken.unique_name || userToken.upn || userToken.name || "").toString()) + ".jpg?d=mm",
                            email: "(" + (userToken.upn ? userToken.upn : userToken.email) + ")"
                        };
                    }
                    catch (error) {
                        currentUser = {
                            name: "User",
                            imageUrl: "https://secure.gravatar.com/avatar/.jpg?d=mm"
                        };
                    }
                    finally {
                        $timeout(() => { $scope.user = currentUser; });
                    }
                });
            }
            function initSettings() {
                if ($.cookie("readOnlyMode") !== undefined) {
                    $scope.setReadOnlyMode($.cookie("readOnlyMode") === "true");
                }
            }
            function expandChild(child, rest, selectedBranch) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (!child) {
                        if (selectedBranch) {
                            const top = document.getElementById("expand-icon-" + selectedBranch.uid).documentOffsetTop() - ((window.innerHeight - 50) / 2);
                            $("#sidebar").scrollTop(top);
                        }
                    }
                    else {
                        $scope.treeControl.select_branch(child);
                        child = $scope.treeControl.get_selected_branch();
                        let expandPromise;
                        if (child && $.isArray(child.children) && child.children.length > 0) {
                            expandPromise = Promise.resolve();
                        }
                        else {
                            expandPromise = $scope.expandResourceHandler(child, undefined, undefined, true);
                        }
                        expandPromise.then().catch().then(() => { $timeout(() => { handlePath(rest); }); });
                    }
                });
            }
            function handlePath(path) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (path.length > 0) {
                        let index = path.indexOf("/");
                        index = (index === -1 ? undefined : index);
                        var current = path.substring(0, index);
                        const rest = path.substring(index + 1);
                        const selectedBranch = $scope.treeControl.get_selected_branch();
                        let matches = [];
                        if (selectedBranch) {
                            if (!selectedBranch.expanded) {
                                try {
                                    yield $scope.expandResourceHandler(selectedBranch, undefined, undefined, true);
                                }
                                catch (err) {
                                    console.log(err);
                                }
                            }
                            matches = $scope.treeControl.get_children(selectedBranch).filter(e => current.toLocaleUpperCase() === (e.value ? e.value.toLocaleUpperCase() : e.label.toLocaleUpperCase()));
                        }
                        else {
                            matches = $scope.treeControl.get_roots().filter(e => e.label.toLocaleUpperCase() === current.toLocaleUpperCase());
                        }
                        const child = (matches.length > 0 ? matches[0] : undefined);
                        expandChild(child, rest, selectedBranch);
                    }
                });
            }
            function setStateForClickOnResource() {
                delete $scope.putError;
                delete $scope.selectedResource;
                $scope.invoking = false;
                $scope.loading = false;
                $scope.creatable = false;
                $scope.editMode = false;
            }
            function setStateForErrorOnResourceClick() {
                $scope.invoking = false;
                $scope.loading = false;
                $scope.editMode = false;
            }
            function setStateForInvokeAction() {
                $scope.loading = true;
                delete $scope.actionResponse;
            }
            function setStateForInvokePut() {
                delete $scope.putError;
                $scope.invoking = true;
            }
            function finalizeDelete(action, response) {
                const currentBranch = $scope.treeControl.get_selected_branch();
                const parent = $scope.treeControl.get_parent_branch(currentBranch);
                if (response.data)
                    $scope.actionResponse = StringUtils.syntaxHighlight(response.data);
                if (action.isDeleteAction() && response.status === 200) {
                    if (currentBranch.uid === $scope.treeControl.get_selected_branch().uid) {
                        $timeout(() => { $scope.treeControl.select_branch(parent); scrollToTop(900); });
                    }
                    parent.children = parent.children.filter(branch => branch.uid !== currentBranch.uid);
                }
                else {
                    $timeout(() => { $scope.selectResourceHandler($scope.treeControl.get_selected_branch(), undefined); });
                }
                ExplorerScreen.fadeInAndFadeOutSuccess();
            }
            function invokeActionErrorCallback(response) {
                $timeout(() => { $scope.actionResponse = response.data ? StringUtils.syntaxHighlight(response.data) : StringUtils.syntaxHighlight(response.message); });
                ExplorerScreen.fadeInAndFadeOutError();
            }
            function invokeActionFinallyCallback() {
                $timeout(() => { $scope.loading = false; $scope.invoking = false; });
            }
            function doInvokeAction(selectedResource, action, event, confirmed) {
                return __awaiter(this, void 0, void 0, function* () {
                    setStateForInvokeAction();
                    if ($scope.readOnlyMode) {
                        if (!action.isGetAction()) {
                            ExplorerScreen.showReadOnlyConfirmation(event);
                            return Promise.resolve("Write attempted in read only mode").then(invokeActionFinallyCallback);
                        }
                    }
                    else if (action.isDeleteAction() && !confirmed) {
                        ExplorerScreen.showDeleteConfirmation(event, (deleteConfirmationHandler) => {
                            deleteConfirmationHandler.stopPropagation();
                            deleteConfirmationHandler.preventDefault();
                            $scope.hideConfirm();
                            doInvokeAction(selectedResource, action, deleteConfirmationHandler, true);
                        });
                        return Promise.resolve("Delete attempted pre-confirmation").then(invokeActionFinallyCallback);
                    }
                    else {
                        const repository = new ArmClientRepository($http);
                        try {
                            const invokeResponse = yield repository.invokeAction(selectedResource, action, $scope.actionsModel);
                            finalizeDelete(action, invokeResponse);
                        }
                        catch (error) {
                            invokeActionErrorCallback(error);
                        }
                        finally {
                            invokeActionFinallyCallback();
                        }
                    }
                    return Promise.resolve("doInvokeAction Complete").then(invokeActionFinallyCallback);
                });
            }
            function getCsmNameFromIdAndName(id, name) {
                const splited = (id ? decodeURIComponent(id) : name).split("/");
                return splited[splited.length - 1];
            }
            function scrollToTop(delay) {
                $timeout(() => { $("html, body").scrollTop(0); }, delay);
            }
            function initTenants() {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        const repository = new ArmClientRepository($http);
                        const tenantCollection = new TenantCollection(repository);
                        yield tenantCollection.buildTenants();
                        $timeout(() => { $scope.tenants = tenantCollection.getTenants(); $scope.selectedTenant = tenantCollection.getSelectedTenant(); });
                    }
                    catch (error) {
                        console.log(error);
                    }
                });
            }
            function initResourcesDefinitions() {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        const repository = new ArmClientRepository($http);
                        $scope.resourceDefinitionsCollection = new ResourceDefinitionCollection(repository);
                        yield $scope.resourceDefinitionsCollection.buildResourceDefinitions();
                        $timeout(() => { $scope.resources = $scope.resourceDefinitionsCollection.getTreeNodes(); });
                    }
                    catch (error) {
                        console.log(error);
                    }
                    finally {
                        $timeout(() => { handlePath($location.path().substring(1)); });
                    }
                });
            }
            function isItemOf(branch, elementType) {
                const parent = $scope.treeControl.get_parent_branch(branch);
                return (parent && parent.resourceDefinition.resourceName === elementType);
            }
            function showExpandingTreeItemIcon(row, branch) {
                const originalTreeIcon = row ? row.tree_icon : "icon-plus  glyphicon glyphicon-plus fa fa-plus";
                $(document.getElementById(`expand-icon-${branch.uid}`)).removeClass(originalTreeIcon).addClass("fa fa-refresh fa-spin");
                return originalTreeIcon;
            }
            function endExpandingTreeItem(branch, originalTreeIcon) {
                $(document.getElementById(`expand-icon-${branch.uid}`)).removeClass("fa fa-spinner fa-spin").addClass(originalTreeIcon);
            }
            function getTreeBranchProjection(childDefinition) {
                const override = ClientConfig.getOverrideFor(childDefinition);
                if (override.getLabel == null) {
                    override.getLabel = (d, csmName) => (d.displayName ? d.displayName : csmName);
                }
                if (override.getSortKey == null) {
                    override.getSortKey = (d, label) => label;
                }
                if (override.getIconNameOverride == null) {
                    override.getIconNameOverride = (d) => null;
                }
                return override;
            }
        }])
        .config(($locationProvider) => {
        $locationProvider.html5Mode(true);
    });
    $('label.tree-toggler').click(function () {
        $(this).parent().children('ul.tree').toggle(300);
    });
    $(document).mouseup((e) => {
        var container = $(".confirm-box");
        if (!container.is(e.target) && container.has(e.target).length === 0) {
            container.fadeOut(300);
            $('#dark-blocker').hide();
        }
    });
})(armExplorer || (armExplorer = {}));
class ArmClientRepository {
    constructor($http) {
        this.$http = $http;
    }
    getApplicableProvidersAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            const applicableProvidersConfig = { method: "GET", url: "api/providers" };
            return yield this.$http(applicableProvidersConfig);
        });
    }
    getApplicableOperations(providers) {
        return __awaiter(this, void 0, void 0, function* () {
            const postProviders = { method: "POST", url: "api/all-operations", data: JSON.stringify(providers.data) };
            return yield this.$http(postProviders);
        });
    }
    getTenants() {
        return __awaiter(this, void 0, void 0, function* () {
            const tenantsConfig = { method: "GET", url: "api/tenants" };
            return yield this.$http(tenantsConfig);
        });
    }
    getUserToken() {
        return __awaiter(this, void 0, void 0, function* () {
            const userTokenConfig = { method: "GET", url: "api/token" };
            return yield this.$http(userTokenConfig);
        });
    }
    searchKeyword(keyword) {
        return __awaiter(this, void 0, void 0, function* () {
            const searchConfig = { method: "GET", url: `api/search?keyword=${keyword}` };
            return yield this.$http(searchConfig);
        });
    }
    invokeAction(selectedResource, action, actionsModel) {
        return __awaiter(this, void 0, void 0, function* () {
            const invokeConfig = {
                method: "POST",
                url: "api/operations",
                data: {
                    Url: action.url,
                    RequestBody: action.getRequestBody(),
                    HttpMethod: action.httpMethod,
                    ApiVersion: selectedResource.apiVersion,
                    QueryString: action.getQueryString(actionsModel)
                }
            };
            return yield this.$http(invokeConfig);
        });
    }
    invokeHttp(httpConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.$http(httpConfig);
        });
    }
    invokePut(selectedResource, action, editorCollection) {
        return __awaiter(this, void 0, void 0, function* () {
            const userObject = editorCollection.getValue(Editor.RequestEditor, true);
            const invokePutConfig = {
                method: "POST",
                url: "api/operations",
                data: {
                    Url: selectedResource.putUrl,
                    HttpMethod: action.httpMethod,
                    RequestBody: userObject,
                    ApiVersion: selectedResource.apiVersion
                }
            };
            return yield this.$http(invokePutConfig);
        });
    }
    invokeCreate(newResourceName, selectedResource, action, editorCollection) {
        return __awaiter(this, void 0, void 0, function* () {
            const userObject = editorCollection.getValue(Editor.CreateEditor, true);
            const invokeCreateConfig = {
                method: "POST",
                url: "api/operations",
                data: {
                    Url: selectedResource.putUrl + "/" + newResourceName,
                    HttpMethod: "PUT",
                    RequestBody: userObject,
                    ApiVersion: selectedResource.apiVersion
                }
            };
            return yield this.$http(invokeCreateConfig);
        });
    }
    getProvidersForSubscription(subscriptionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const getProvidersConfig = {
                method: "GET",
                url: `api/operations/providers/${subscriptionId}`
            };
            return yield this.$http(getProvidersConfig);
        });
    }
}
class ClientConfig {
    static getOverrideFor(childDefinition) {
        const overrides = ClientConfig.treeBranchDataOverrides.filter(t => childDefinition.url.endsWith(t.childDefinitionUrlSuffix));
        const override = overrides.length > 0
            ? overrides[0]
            : {
                childDefinitionUrlSuffix: null,
                getLabel: null,
                getSortKey: null,
                getIconNameOverride: null,
                sortOrder: 1
            };
        return override;
    }
}
ClientConfig.treeBranchDataOverrides = [
    {
        childDefinitionUrlSuffix: "providers/Microsoft.Resources/deployments/{name}",
        getLabel: null,
        getSortKey: (d, label) => d.properties.timestamp,
        getIconNameOverride: (d) => {
            switch (d.properties.provisioningState) {
                case "Succeeded": return "glyphicon glyphicon-ok-circle";
                case "Running": return "glyphicon glyphicon-play-circle";
                case "Failed": return "glyphicon glyphicon-remove-circle";
                default: return null;
            }
        },
        sortOrder: -1
    },
    {
        childDefinitionUrlSuffix: "providers/Microsoft.Resources/deployments/{name}/operations/{name}",
        getLabel: (d, csmName) => {
            if (d.properties.targetResource !== undefined && d.properties.targetResource.resourceName !== undefined) {
                return d.properties.targetResource.resourceName + " (" + d.properties.targetResource.resourceType + ")";
            }
            else {
                return d.properties.provisioningOperation + " (" + d.operationId + ")";
            }
        },
        getSortKey: (d, label) => d.properties.timestamp,
        getIconNameOverride: (d) => {
            switch (d.properties.provisioningState) {
                case "Succeeded": return "glyphicon glyphicon-ok-circle";
                case "Running": return "glyphicon glyphicon-play-circle";
                case "Failed": return "glyphicon glyphicon-remove-circle";
                default: return null;
            }
        },
        sortOrder: -1
    }
];
ClientConfig.aceConfig = {
    mode: "json",
    theme: "tomorrow",
    onLoad: (_ace) => {
        _ace.setOptions({
            maxLines: Infinity,
            fontSize: 15,
            wrap: "free",
            showPrintMargin: false
        });
        _ace.resize();
    }
};
class DocumentationGenerator {
    static getDocumentationFlatArray(editorData, doc) {
        const docArray = [];
        if (doc) {
            doc = (doc.properties ? doc.properties : (doc.value ? doc.value[0].properties : {}));
        }
        if (editorData && doc) {
            editorData = (editorData.properties ? editorData.properties : ((editorData.value && editorData.value.length > 0) ? editorData.value[0].properties : {}));
            const set = {};
            for (var prop in editorData) {
                if (editorData.hasOwnProperty(prop) && doc[prop]) {
                    docArray.push({
                        name: prop,
                        doc: doc[prop]
                    });
                    set[prop] = 1;
                }
            }
            for (var prop in doc) {
                if (doc.hasOwnProperty(prop) && !set[prop]) {
                    docArray.push({
                        name: prop,
                        doc: doc[prop]
                    });
                }
            }
        }
        else {
            docArray.push({ name: "message", doc: "No documentation available" });
        }
        return ObjectUtils.flattenArray(docArray);
    }
}
var Editor;
(function (Editor) {
    Editor[Editor["ResponseEditor"] = 0] = "ResponseEditor";
    Editor[Editor["RequestEditor"] = 1] = "RequestEditor";
    Editor[Editor["CreateEditor"] = 2] = "CreateEditor";
    Editor[Editor["AnsibleEditor"] = 3] = "AnsibleEditor";
    Editor[Editor["PowershellEditor"] = 4] = "PowershellEditor";
    Editor[Editor["AzureCliEditor"] = 5] = "AzureCliEditor";
})(Editor || (Editor = {}));
class EditorCollection {
    constructor() {
        this.editors = [null, null, null, null, null, null];
        this.editors[Editor.ResponseEditor] = ace.edit("response-json-editor");
        this.editors[Editor.RequestEditor] = ace.edit("request-json-editor");
        this.editors[Editor.CreateEditor] = ace.edit("json-create-editor");
        this.editors[Editor.AnsibleEditor] = ace.edit("ansible-editor");
        this.editors.length = 4;
    }
    isHidden(editor) {
        return editor === Editor.AzureCliEditor || editor === Editor.PowershellEditor;
    }
    getValue(editor, cleanObject) {
        const currentEditor = this.editors[editor];
        let value = JSON.parse(currentEditor.getValue());
        if (cleanObject)
            ObjectUtils.cleanObject(value);
        return value;
    }
    setValue(editor, stringValue) {
        if (this.isHidden(editor)) {
            return;
        }
        const currentEditor = this.editors[editor];
        currentEditor.setValue(stringValue);
        currentEditor.session.selection.clearSelection();
        currentEditor.moveCursorTo(0, 0);
    }
    setMode(editor, mode) {
        if (this.isHidden(editor)) {
            return;
        }
        const currentEditor = this.editors[editor];
        currentEditor.getSession().setMode(mode);
    }
    setTheme(editor, theme) {
        if (this.isHidden(editor)) {
            return;
        }
        const currentEditor = this.editors[editor];
        currentEditor.setTheme(theme);
    }
    setShowGutter(editor, showGutter) {
        if (this.isHidden(editor)) {
            return;
        }
        const currentEditor = this.editors[editor];
        currentEditor.renderer.setShowGutter(showGutter);
    }
    setReadOnly(editor, setBackground) {
        if (this.isHidden(editor)) {
            return;
        }
        const currentEditor = this.editors[editor];
        setBackground = typeof setBackground !== 'undefined' ? setBackground : true;
        currentEditor.setOptions({
            readOnly: true,
            highlightActiveLine: false,
            highlightGutterLine: false
        });
        const virtualRenderer = currentEditor.renderer;
        virtualRenderer.$cursorLayer.element.style.opacity = 0;
        virtualRenderer.setStyle("disabled", true);
        if (setBackground)
            currentEditor.container.style.background = "#f5f5f5";
        currentEditor.blur();
    }
    apply(callbackFn) {
        this.editors.map(callbackFn);
    }
    resize(editor) {
        if (this.isHidden(editor)) {
            return;
        }
        const currentEditor = this.editors[editor];
        currentEditor.resize();
    }
    configureEditors() {
        this.editors.map((editor) => {
            editor.setOptions({
                maxLines: Infinity,
                fontSize: 15,
                wrap: "free",
                showPrintMargin: false
            });
            editor.setTheme("ace/theme/tomorrow");
            editor.getSession().setMode("ace/mode/json");
            editor.getSession().setNewLineMode("windows");
            const commandManager = editor.commands;
            commandManager.removeCommand("find");
        });
        this.setReadOnly(Editor.ResponseEditor);
        this.setValue(Editor.ResponseEditor, StringUtils.stringify({ message: "Select a node to start" }));
        this.setReadOnly(Editor.PowershellEditor, false);
        this.setReadOnly(Editor.AnsibleEditor, false);
        this.setReadOnly(Editor.AzureCliEditor, false);
        this.setTheme(Editor.PowershellEditor, "ace/theme/tomorrow_night_blue");
        this.setTheme(Editor.AzureCliEditor, "ace/theme/tomorrow_night_blue");
        this.setShowGutter(Editor.PowershellEditor, false);
        this.setShowGutter(Editor.AnsibleEditor, false);
        this.setShowGutter(Editor.AzureCliEditor, false);
        this.setMode(Editor.PowershellEditor, "ace/mode/powershell");
        this.setValue(Editor.PowershellEditor, "# PowerShell equivalent script");
        this.setMode(Editor.AnsibleEditor, "ace/mode/yaml");
        this.setValue(Editor.AnsibleEditor, "# Ansible Playbooks");
        this.setMode(Editor.AzureCliEditor, "ace/mode/sh");
        this.setValue(Editor.AzureCliEditor, "# Azure CLI 2.0 equivalent script");
    }
}
class ExplorerScreen {
    static showReadOnlyConfirmation(event) {
        if (event) {
            const clickedButton = $(event.currentTarget);
            const readonlyConfirmation = $("#readonly-confirm-box");
            const offset = (clickedButton.outerHeight() < 40 ? 8 : 0);
            readonlyConfirmation.css({ top: (clickedButton.offset().top - clickedButton.outerHeight(true) - offset) + 'px', left: (clickedButton.offset().left + clickedButton.outerWidth()) + 'px' });
            $("#dark-blocker").show();
            readonlyConfirmation.show();
        }
    }
    static showDeleteConfirmation(event, deleteClickHandler) {
        const deleteButton = $(event.currentTarget);
        const deleteConfirmation = $("#delete-confirm-box");
        deleteConfirmation.css({ top: (deleteButton.offset().top - (((deleteButton.outerHeight() + 10) / 2))) + 'px', left: (deleteButton.offset().left + deleteButton.outerWidth()) + 'px' });
        $("#yes-delete-confirm").off("click").click(deleteClickHandler);
        $("#dark-blocker").show();
        deleteConfirmation.show();
    }
    static fadeInAndFadeOutSuccess() {
        setTimeout(() => {
            $(".success-marker").fadeIn(1500);
            setTimeout(() => {
                $(".success-marker").fadeOut(1500);
            }, 1200);
        }, 500);
    }
    static fadeInAndFadeOutError() {
        setTimeout(() => {
            $(".failure-marker").fadeIn(1500);
            setTimeout(() => {
                $(".failure-marker").fadeOut(1500);
            }, 1200);
        }, 500);
    }
}
class ResourceDefinitionCollection {
    constructor(repository) {
        this.repository = repository;
        this.resourcesDefinitionsTable = [];
    }
    isSupportedTreeNode(url) {
        const splits = url.split("/");
        return (splits.length === 4) && ResourceDefinitionCollection.supportedRootNodes.includes(splits[3].toLowerCase());
    }
    getTable() {
        return this.resourcesDefinitionsTable;
    }
    getTreeNodes() {
        return this.resourcesDefinitionsTable.filter((rd) => { return this.isSupportedTreeNode(rd.url); })
            .getUnique((rd) => { return rd.url.split("/")[3]; }).map((urd) => {
            const treeBranch = new TreeBranch(urd.url.split("/")[3]);
            treeBranch.resourceDefinition = urd;
            treeBranch.data = undefined;
            treeBranch.resource_icon = "fa fa-cube fa-fw";
            treeBranch.children = [];
            treeBranch.elementUrl = urd.url;
            treeBranch.sortValue = null;
            treeBranch.iconNameOverride = null;
            return treeBranch;
        });
    }
    getResourceDefinitionByNameAndUrl(name, url) {
        const resourceDefinitions = this.getMatchingDefinitions(r => (r.resourceName === name) &&
            ((r.url.toLowerCase() === url.toLowerCase()) ||
                r.url.toLowerCase() === (url.toLowerCase() + "/" + name.toLowerCase())));
        if (resourceDefinitions.length > 1) {
            console.log("ASSERT! duplicate ids in resourceDefinitionsTable");
            console.log(resourceDefinitions);
        }
        return resourceDefinitions[0];
    }
    getMatchingDefinitions(predicate) {
        return this.resourcesDefinitionsTable.filter(predicate);
    }
    fixOperationUrl(operation) {
        if (operation.Url.indexOf("SourceControls/{name}") !== -1) {
            operation.Url = operation.Url.replace("SourceControls/{name}", "SourceControls/{sourceControlName}");
        }
        if (operation.Url.indexOf("serverFarms/{name}") !== -1) {
            operation.Url = operation.Url.replace("serverFarms/{name}", "serverFarms/{webHostingPlanName}");
        }
        if (operation.Url.indexOf("resourcegroups") !== -1) {
            operation.Url = operation.Url.replace("resourcegroups", "resourceGroups");
        }
        if (operation.Url.endsWith("/")) {
            operation.Url = operation.Url.substring(0, operation.Url.length - 1);
        }
        return operation;
    }
    removeActionLessDefinitions() {
        for (let index = this.resourcesDefinitionsTable.length - 1; index >= 0; index--) {
            const resourceDefinition = this.resourcesDefinitionsTable[index];
            if (resourceDefinition.hideFromExplorerView()) {
                this.resourcesDefinitionsTable.splice(index, 1);
            }
        }
    }
    buildResourceDefinitions() {
        return __awaiter(this, void 0, void 0, function* () {
            const applicableProviders = yield this.repository.getApplicableProvidersAsync();
            const applicableOperationsResponse = yield this.repository.getApplicableOperations(applicableProviders);
            const applicableOperations = applicableOperationsResponse.data;
            applicableOperations.sort((a, b) => { return a.Url.localeCompare(b.Url); });
            applicableOperations.map((operation) => {
                operation = this.fixOperationUrl(operation);
                this.addOperation(operation);
            });
            this.sortChildren();
            this.removeActionLessDefinitions();
        });
    }
    sortChildren() {
        this.resourcesDefinitionsTable.map((resourceDefinition) => {
            var children = resourceDefinition.children;
            if (typeof children !== "string" && Array.isArray(children)) {
                children.sort();
            }
        });
    }
    setParent(url, action, requestBody, requestBodyDoc, apiVersion) {
        var segments = url.split("/").filter(a => a.length !== 0);
        var resourceName = segments.pop();
        var parentName = url.substring(0, url.lastIndexOf("/"));
        if (parentName === undefined || parentName === "" || resourceName === undefined)
            return;
        var parents = this.resourcesDefinitionsTable.filter(rd => rd.url.toLowerCase() === parentName.toLowerCase());
        var parent;
        if (parents.length === 1) {
            parent = parents[0];
            if (resourceName.match(/\{.*\}/g)) {
                if (parent.children === undefined || typeof parent.children === "string") {
                    parent.children = resourceName;
                }
                else {
                    console.log("ASSERT1, typeof parent.children: " + typeof parent.children);
                }
            }
            else if (resourceName !== "list") {
                if (parent.children === undefined) {
                    parent.children = [resourceName];
                }
                else if (Array.isArray(parent.children)) {
                    if (parent.children.filter(c => c === resourceName).length === 0) {
                        parent.children.push(resourceName);
                    }
                }
                else {
                    parent.children = [resourceName];
                    console.log("ASSERT2, typeof parent.children: " + typeof parent.children);
                }
            }
        }
        else {
            parent = this.addOperation(undefined, url.substring(0, url.lastIndexOf("/")));
            this.setParent(url);
        }
        if (action && parent && parent.actions.filter(c => c === action).length === 0) {
            parent.actions.push(action);
        }
        if (requestBody && parent && !parent.requestBody) {
            parent.requestBody = requestBody;
        }
        if (requestBodyDoc && parent && !parent.requestBodyDoc) {
            parent.requestBodyDoc = requestBodyDoc;
        }
        if (apiVersion && parent && !parent.apiVersion) {
            parent.apiVersion = apiVersion;
        }
    }
    addOperation(operation, url) {
        url = (operation ? operation.Url : url);
        url = url.replace(/{.*?}/g, "{name}");
        var segments = url.split("/").filter(a => a.length !== 0);
        var resourceName = segments.pop();
        var addedElement = undefined;
        if (resourceName === "list" && operation && operation.HttpMethod === "POST") {
            this.setParent(url, "GETPOST", operation.RequestBody, operation.RequestBodyDoc, operation.ApiVersion);
            return addedElement;
        }
        else if (operation && (operation.MethodName.startsWith("Create") || operation.MethodName.startsWith("BeginCreate") || operation.MethodName.startsWith("Put")) && operation.HttpMethod === "PUT") {
            this.setParent(url, "CREATE", operation.RequestBody, operation.RequestBodyDoc);
            if (operation.MethodName.indexOf("Updat") === -1) {
                return addedElement;
            }
        }
        var elements = this.resourcesDefinitionsTable.filter(r => r.url.toLowerCase() === url.toLowerCase());
        if (elements.length === 1) {
            if (operation) {
                elements[0].requestBody = (elements[0].requestBody ? elements[0].requestBody : operation.RequestBody);
                elements[0].apiVersion = operation.ApiVersion;
                if (elements[0].actions.filter(c => c === operation.HttpMethod).length === 0) {
                    elements[0].actions.push(operation.HttpMethod);
                }
                if (operation.HttpMethod === "GET") {
                    elements[0].responseBodyDoc = operation.ResponseBodyDoc;
                }
                else if (operation.HttpMethod === "PUT") {
                    elements[0].requestBodyDoc = operation.RequestBodyDoc;
                }
            }
        }
        else {
            addedElement = new ResourceDefinition();
            addedElement.resourceName = resourceName;
            addedElement.children = undefined;
            addedElement.actions = (operation ? [operation.HttpMethod] : []);
            addedElement.url = url;
            addedElement.requestBody = operation ? operation.RequestBody : {},
                addedElement.requestBodyDoc = operation ? operation.RequestBodyDoc : {},
                addedElement.responseBodyDoc = operation ? operation.ResponseBodyDoc : {},
                addedElement.query = operation ? operation.Query : [],
                addedElement.apiVersion = operation && operation.ApiVersion ? operation.ApiVersion : undefined;
            this.resourcesDefinitionsTable.push(addedElement);
        }
        this.setParent(url);
        return addedElement;
    }
    getActionsAndVerbs(treeBranch) {
        const actions = [];
        if (treeBranch.resourceDefinition.actions.includes("DELETE")) {
            actions.push(new Action("DELETE", "Delete", treeBranch.getGetActionUrl()));
        }
        const children = treeBranch.resourceDefinition.children;
        if (typeof children !== "string" && Array.isArray(children)) {
            children.filter(childString => {
                var matchingDefinition = this.getMatchingDefinitions(r => (r.resourceName === childString) &&
                    ((r.url === treeBranch.resourceDefinition.url) || r.url === (treeBranch.resourceDefinition.url + "/" + childString)));
                return matchingDefinition.length === 1;
            }).map(childString => {
                var resourceDefinition = this.getResourceDefinitionByNameAndUrl(childString, treeBranch.resourceDefinition.url + "/" + childString);
                if (resourceDefinition.children === undefined && Array.isArray(resourceDefinition.actions) && resourceDefinition.actions.filter(actionName => actionName === "POST").length > 0) {
                    const newAction = new Action("POST", resourceDefinition.resourceName, treeBranch.getGetActionUrl() + "/" + resourceDefinition.resourceName);
                    newAction.requestBody = (resourceDefinition.requestBody ? StringUtils.stringify(resourceDefinition.requestBody) : undefined);
                    newAction.query = resourceDefinition.query;
                    actions.push(newAction);
                }
            });
        }
        return actions;
    }
}
ResourceDefinitionCollection.supportedRootNodes = ['providers', 'subscriptions'];
class ResourceSearchDataModel {
    constructor() {
        this.isSuggestListDisplay = false;
        this.suggestions = [];
    }
    turnOffSuggestions() {
        this.isSuggestListDisplay = false;
    }
    turnOnSuggestions() {
        this.isSuggestListDisplay = true;
    }
    addSuggestion(suggestion) {
        this.suggestions.push(suggestion);
    }
    setSuggestions(suggestions) {
        this.suggestions = suggestions;
    }
    getSuggestions() {
        return this.suggestions;
    }
}
class ResourceSearcher {
    constructor(resourceSearchModel, repository) {
        this.resourceSearchModel = resourceSearchModel;
        this.repository = repository;
        this.resourceSearchCache = new ResourcesCache(repository);
        this.resourceSearchCache.refresh();
    }
    resourceSearch() {
        return __awaiter(this, void 0, void 0, function* () {
            this.resourceSearchCache.refresh();
            var keyword = this.resourceSearchModel.searchKeyword || "";
            this.resourceSearchCache.setSearchKeyword(keyword);
            const results = this.resourceSearchCache.getSuggestions(keyword);
            this.resourceSearchModel.setSuggestions(results);
            if (this.resourceSearchModel.getSuggestions().length > 0) {
                this.resourceSearchModel.turnOnSuggestions();
            }
            else {
                this.resourceSearchModel.turnOffSuggestions();
            }
            if (this.resourceSearchCache.getSearchKeyword()) {
                const searchResponse = yield this.repository.searchKeyword(keyword);
                const searchResults = searchResponse.data;
                searchResults.forEach((item) => {
                    if (keyword === this.resourceSearchCache.data.currentKeyword && !this.resourceSearchCache.data[item.id]) {
                        this.resourceSearchModel.addSuggestion(item);
                    }
                    this.resourceSearchCache.data[item.id] = item;
                });
            }
        });
    }
}
class ResourcesCache {
    constructor(repository) {
        this.repository = repository;
        this.suggestionSortFunc = (a, b) => {
            var result = a.type.compare(b.type, true);
            if (result === 0) {
                return a.name.compare(b.name, true);
            }
            return result;
        };
        this.isResourceCacheRefreshing = false;
        this.currentSearchKeyword = "";
    }
    cacheExpired() {
        return (Date.now() - this.timestamp) > ResourcesCache.resourceCacheExpiration;
    }
    clearCache() {
        this.data = {};
        this.timestamp = Date.now();
    }
    refresh() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.cacheExpired() && !this.isResourceCacheRefreshing) {
                    this.isResourceCacheRefreshing = true;
                    const searchResponse = yield this.repository.searchKeyword("");
                    const response = searchResponse.data;
                    this.clearCache();
                    response.forEach((item) => { this.data[item.id] = item; });
                }
            }
            catch (error) {
                console.log(error);
            }
            finally {
                this.isResourceCacheRefreshing = false;
            }
        });
    }
    setSearchKeyword(keyword) {
        this.currentSearchKeyword = keyword;
    }
    getSearchKeyword() {
        return this.currentSearchKeyword;
    }
    getSuggestions(keyword) {
        var results = [];
        for (var itemKey in this.data) {
            var item = this.data[itemKey];
            if (item && item.name && item.type &&
                (item.name.toLowerCase().indexOf(keyword.toLowerCase()) > -1 || item.type.toLowerCase().indexOf(keyword.toLowerCase()) > -1)) {
                results.push(item);
            }
        }
        results.sort(this.suggestionSortFunc);
        return results;
    }
}
ResourcesCache.resourceCacheExpiration = 5 * 60 * 1000;
class ObjectUtils {
    static isEmptyObjectOrArray(obj) {
        if (typeof obj === "number" || typeof obj === "boolean")
            return false;
        if ($.isEmptyObject(obj))
            return true;
        if (obj === null || obj === "" || obj.length === 0)
            return true;
        return false;
    }
    static flattenArray(array) {
        for (var i = 0; i < array.length; i++) {
            if (typeof array[i].doc !== "string") {
                var flat = ObjectUtils.flattenObject(array[i].name, array[i].doc);
                var first = array.slice(0, i);
                var end = array.slice(i + 1);
                array = first.concat(flat).concat(end);
                i += flat.length - 1;
            }
        }
        return array;
    }
    static flattenObject(prefix, object) {
        var flat = [];
        if (typeof object === "string") {
            flat.push({
                name: prefix,
                doc: object
            });
        }
        else if (Array.isArray(object)) {
            flat = flat.concat(ObjectUtils.flattenObject(prefix, object[0]));
        }
        else if (ObjectUtils.isEmptyObjectOrArray(object)) {
            flat.push({
                name: prefix,
                doc: ""
            });
        }
        else {
            for (var prop in object) {
                if (object.hasOwnProperty(prop)) {
                    if (typeof object[prop] === "string") {
                        flat.push({
                            name: prefix + "." + prop,
                            doc: object[prop]
                        });
                    }
                    else if (Array.isArray(object[prop]) && object[prop].length > 0) {
                        flat = flat.concat(ObjectUtils.flattenObject(prefix + "." + prop, object[prop][0]));
                    }
                    else if (typeof object[prop] === "object") {
                        flat = flat.concat(ObjectUtils.flattenObject(prefix + "." + prop, object[prop]));
                    }
                    else {
                        flat.push({
                            name: prefix,
                            doc: object
                        });
                    }
                }
            }
        }
        return flat;
    }
    static sortByObject(toBeSorted, toSortBy) {
        if (toBeSorted === toSortBy)
            return toBeSorted;
        const sorted = {};
        for (var key in toSortBy) {
            if (toSortBy.hasOwnProperty(key)) {
                var obj;
                if (typeof toSortBy[key] === "object" && !Array.isArray(toSortBy[key]) && toSortBy[key] != null) {
                    obj = ObjectUtils.sortByObject(toBeSorted[key], toSortBy[key]);
                }
                else {
                    obj = toBeSorted[key];
                }
                sorted[key] = obj;
            }
        }
        for (var key in toBeSorted) {
            if (toBeSorted.hasOwnProperty(key) && sorted[key] === undefined) {
                sorted[key] = toBeSorted[key];
            }
        }
        return sorted;
    }
    static cleanObject(obj) {
        const hadProperties = (obj.properties !== undefined);
        ObjectUtils.recursiveCleanObject(obj);
        if (hadProperties && !obj.properties) {
            obj.properties = {};
        }
    }
    static recursiveCleanObject(obj) {
        for (let property in obj) {
            if (obj.hasOwnProperty(property)) {
                if (typeof obj[property] === "string" && (/^\(.*\)$/.test(obj[property]))) {
                    delete obj[property];
                }
                else if (Array.isArray(obj[property])) {
                    const hadElements = obj[property].length > 0;
                    obj[property] = obj[property].filter((element) => {
                        if (typeof element === "string" && (/^\(.*\)$/.test(element))) {
                            return false;
                        }
                        else if (typeof element === "object" && !$.isEmptyObject(element)) {
                            this.recursiveCleanObject(element);
                        }
                        else if (typeof element === "object" && $.isEmptyObject(element)) {
                            return false;
                        }
                        if ($.isPlainObject(element) && $.isEmptyObject(element))
                            return false;
                        return true;
                    });
                    if (hadElements && obj[property].length === 0)
                        delete obj[property];
                }
                else if (typeof obj[property] === "object" && !$.isEmptyObject(obj[property])) {
                    this.recursiveCleanObject(obj[property]);
                    if ($.isEmptyObject(obj[property]))
                        delete obj[property];
                }
                else if (typeof obj[property] === "object" && $.isEmptyObject(obj[property])) {
                    delete obj[property];
                }
            }
        }
    }
    static mergeObject(source, target) {
        for (let sourceProperty in source) {
            if (source.hasOwnProperty(sourceProperty) && target.hasOwnProperty(sourceProperty)) {
                if (!ObjectUtils.isEmptyObjectOrArray(source[sourceProperty]) && (typeof source[sourceProperty] === "object") && !Array.isArray(source[sourceProperty])) {
                    ObjectUtils.mergeObject(source[sourceProperty], target[sourceProperty]);
                }
                else if (Array.isArray(source[sourceProperty]) && Array.isArray(target[sourceProperty])) {
                    var targetModel = target[sourceProperty][0];
                    target[sourceProperty] = source[sourceProperty];
                    target[sourceProperty].push(targetModel);
                }
                else {
                    target[sourceProperty] = source[sourceProperty];
                }
            }
            else if (source.hasOwnProperty(sourceProperty)) {
                target[sourceProperty] = source[sourceProperty];
            }
        }
        return target;
    }
    static getPsObjectFromJson(json, nestingLevel) {
        var tabs = "";
        for (var i = 0; i < nestingLevel; i++) {
            tabs += "\t";
        }
        var jsonObj = JSON.parse(json);
        if (typeof jsonObj === "string") {
            return "\"" + jsonObj + "\"";
        }
        else if (typeof jsonObj === "boolean") {
            return jsonObj.toString();
        }
        else if (typeof jsonObj === "number") {
            return jsonObj.toString();
        }
        else if (Array.isArray(jsonObj)) {
            var result = "(\n";
            for (var i = 0; i < jsonObj.length; i++) {
                result += tabs + "\t" + ObjectUtils.getPsObjectFromJson(JSON.stringify(jsonObj[i]), nestingLevel + 1) + "\n";
            }
            return result + tabs + ")";
        }
        else if (typeof jsonObj === "object") {
            var result = "@{\n";
            for (var prop in jsonObj) {
                if (jsonObj.hasOwnProperty(prop)) {
                    result += tabs + "\t" + prop + " = " + ObjectUtils.getPsObjectFromJson(JSON.stringify(jsonObj[prop]), nestingLevel + 1) + "\n";
                }
            }
            return result + tabs + "}\n";
        }
        return json;
    }
}
class StringUtils {
    static selectiveUrlencode(url) {
        return url.replace(/\#/g, '%23').replace(/\s/g, '%20');
    }
    static stringify(object) {
        return JSON.stringify(object, undefined, 2);
    }
    static escapeHtmlEntities(str) {
        return $('<div/>').text(str).html();
    }
    static syntaxHighlight(json) {
        if (typeof json === "string")
            return StringUtils.escapeHtmlEntities(json);
        let str = this.stringify(json);
        str = StringUtils.escapeHtmlEntities(str);
        return str.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                }
                else {
                    cls = 'string';
                }
            }
            else if (/true|false/.test(match)) {
                cls = 'boolean';
            }
            else if (/null/.test(match)) {
                cls = 'null';
            }
            if (cls === 'string' && ((match.slice(0, "\"http://".length) == "\"http://") || (match.slice(0, "\"https://".length) == "\"https://"))) {
                match = match.replace("/api/", "/");
                return '<span><a class="json-link" target="_blank" href=' + match + '>' + match + '</a></span>';
            }
            else {
                return '<span class="' + cls + '">' + match + '</span>';
            }
        });
    }
}
if (!Element.prototype.documentOffsetTop) {
    Element.prototype.documentOffsetTop = function () {
        return this.offsetTop + (this.offsetParent ? this.offsetParent.documentOffsetTop() : 0);
    };
}
var armExplorer;
(function (armExplorer) {
    class StringDictionary {
        constructor() {
            this.items = {};
        }
        contains(key) {
            return this.items.hasOwnProperty(key);
        }
        put(key, value) {
            this.items[key] = value;
        }
        get(key) {
            return this.items[key];
        }
    }
    armExplorer.StringDictionary = StringDictionary;
})(armExplorer || (armExplorer = {}));
if (!String.prototype.compare) {
    String.prototype.compare = function (target, ignoreCase) {
        var selfValue = this;
        var targetValue = target || "";
        if (ignoreCase) {
            selfValue = selfValue.toLowerCase();
            targetValue = targetValue.toLowerCase();
        }
        if (selfValue > targetValue) {
            return 1;
        }
        else if (selfValue < targetValue) {
            return -1;
        }
        else {
            return 0;
        }
    };
}
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (str) {
        return this.slice(0, str.length) === str;
    };
}
if (!String.prototype.endsWith) {
    String.prototype.endsWith = function (str) {
        return this.indexOf(str, this.length - str.length) !== -1;
    };
}
if (!String.prototype.contains) {
    String.prototype.contains = function (str, ignoreCase) {
        var selfValue = this;
        var searchValue = str || "";
        if (ignoreCase) {
            selfValue = selfValue.toLowerCase();
            searchValue = searchValue.toLowerCase();
        }
        return selfValue.indexOf(searchValue) !== -1;
    };
}
if (!Array.prototype.includes) {
    Array.prototype.includes = function (searchElement) {
        if (this === undefined || this === null) {
            throw new TypeError('Cannot convert this value to object');
        }
        var O = Object(this);
        var len = parseInt(O.length) || 0;
        if (len === 0) {
            return false;
        }
        var k = 0;
        while (k < len) {
            var currentElement = O[k];
            if (searchElement === currentElement ||
                (searchElement !== searchElement && currentElement !== currentElement)) {
                return true;
            }
            k++;
        }
        return false;
    };
}
Array.prototype.remove = function (from, to) {
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
};
Array.prototype.getUnique = function (getValue) {
    var u = {}, a = [];
    for (var i = 0, l = this.length; i < l; ++i) {
        var value = getValue(this[i]);
        if (u.hasOwnProperty(value)) {
            continue;
        }
        a.push(this[i]);
        u[value] = 1;
    }
    return a;
};
Array.prototype.indexOfDelegate = function (predicate, fromIndex) {
    var k;
    if (this == null) {
        throw new TypeError('"this" is null or not defined');
    }
    var O = Object(this);
    var len = O.length >>> 0;
    if (len === 0) {
        return -1;
    }
    var n = +fromIndex || 0;
    if (Math.abs(n) === Infinity) {
        n = 0;
    }
    if (n >= len) {
        return -1;
    }
    k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
    while (k < len) {
        var kValue;
        if (k in O && predicate(O[k])) {
            return k;
        }
        k++;
    }
    return -1;
};
if (!Array.prototype.some) {
    Array.prototype.some = function (fun) {
        'use strict';
        if (this == null) {
            throw new TypeError('Array.prototype.some called on null or undefined');
        }
        if (typeof fun !== 'function') {
            throw new TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
        for (var i = 0; i < len; i++) {
            if (i in t && fun.call(thisArg, t[i], i, t)) {
                return true;
            }
        }
        return false;
    };
}
if (!Array.prototype.last) {
    Array.prototype.last = function () {
        return this[this.length - 1];
    };
}
;
if (!Array.prototype.find) {
    Array.prototype.find = function (predicate) {
        if (this == null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;
        for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
                return value;
            }
        }
        return undefined;
    };
}
class Action {
    constructor(httpMethod, name, url) {
        this.httpMethod = httpMethod;
        this.name = name;
        this.url = url;
    }
    getRequestBody() {
        let requestBody = undefined;
        if (this.requestBody) {
            const editor = ace.edit(this.name + "-editor");
            requestBody = JSON.parse(editor.getValue());
        }
        return requestBody;
    }
    getQueryString(actionsModel) {
        let queryString = undefined;
        if (this.query) {
            queryString = this.query.reduce((previous, current) => {
                return previous + ((actionsModel[current] && actionsModel[current].trim() !== "")
                    ? `&${current}=${actionsModel[current].trim()}`
                    : "");
            }, "");
        }
        return queryString;
    }
    isGetAction() {
        return this.httpMethod === "GET" || (this.httpMethod === "POST" && this.url.split('/').last() === "list");
    }
    isDeleteAction() {
        return this.httpMethod === "DELETE";
    }
}
class ResourceDefinition {
    getGetActions() {
        return this.actions.filter(a => (a === "GET" || a === "GETPOST"));
    }
    hasCreateAction() {
        return this.actions.includes("CREATE");
    }
    hasPutOrPatchAction() {
        return this.actions.some(a => (a === "PATCH" || a === "PUT"));
    }
    hasPostAction() {
        return this.actions.some(a => (a === "POST"));
    }
    getEditable(responseData) {
        let editable;
        if (this.requestBody && ObjectUtils.isEmptyObjectOrArray(this.requestBody.properties)) {
            editable = responseData;
        }
        else {
            editable = jQuery.extend(true, {}, this.requestBody);
            const dataCopy = jQuery.extend(true, {}, responseData);
            ObjectUtils.mergeObject(dataCopy, editable);
        }
        return editable;
    }
    hasRequestBody() {
        return !ObjectUtils.isEmptyObjectOrArray(this.requestBody);
    }
    getDocBody() {
        return !ObjectUtils.isEmptyObjectOrArray(this.responseBodyDoc) ? this.responseBodyDoc : this.requestBodyDoc;
    }
    hideFromExplorerView() {
        return (this.actions.length === 0) && !this.url.contains("providers", true);
    }
}
class TenantCollection {
    constructor(repository) {
        this.repository = repository;
        this.tenants = [];
    }
    getTenants() {
        return this.tenants;
    }
    getSelectedTenant() {
        return this.selectedTenant;
    }
    buildTenants() {
        return __awaiter(this, void 0, void 0, function* () {
            let tenantsResponse = yield this.repository.getTenants();
            let tenantsData = tenantsResponse.data;
            this.tenants = tenantsData.map(tenant => {
                return {
                    name: tenant.DisplayName + " (" + tenant.DomainName + ")",
                    id: tenant.TenantId,
                    current: tenant.Current
                };
            });
            this.selectedTenant = this.tenants[this.tenants.indexOfDelegate(tenant => tenant.current)];
        });
    }
}
class TreeBranch {
    constructor(label) {
        this.label = label;
    }
    getGetHttpConfig() {
        const getActions = this.resourceDefinition.getGetActions();
        let httpConfig = null;
        if (getActions.length === 1) {
            const getAction = (getActions[0] === "GETPOST" ? "POST" : "GET");
            httpConfig = {
                method: "POST",
                url: "api/operations",
                data: {
                    Url: (getAction === "POST" ? this.elementUrl + "/list" : this.elementUrl),
                    HttpMethod: getAction,
                    ApiVersion: this.resourceDefinition.apiVersion
                }
            };
        }
        return httpConfig;
    }
    getGetActionUrl() {
        const getActions = this.resourceDefinition.getGetActions();
        let getActionUrl = null;
        if (getActions.length === 1) {
            if (getActions[0] === "GETPOST") {
                getActionUrl = this.elementUrl + "/list";
            }
            else {
                getActionUrl = this.elementUrl;
            }
        }
        return getActionUrl;
    }
    findCommonAncestor(armIdA, armIdB) {
        const getTokensFromId = (url) => {
            url = url.toLowerCase();
            var removeTo = 0;
            if (url.startsWith("http")) {
                removeTo = 2;
            }
            var tokens = url.split('/');
            tokens.remove(0, removeTo);
            return tokens;
        };
        const tokensA = getTokensFromId(armIdA);
        const tokensB = getTokensFromId(armIdB);
        const len = Math.min(tokensA.length, tokensB.length);
        let commonAncestor = "";
        for (let i = 0; i < len; i++) {
            if (tokensA[i] === tokensB[i]) {
                commonAncestor += "/" + tokensA[i];
            }
            else {
                break;
            }
        }
        return commonAncestor;
    }
    getCommonAncestorBranch(otherBranchUrl) {
        return this.findCommonAncestor(otherBranchUrl, this.elementUrl);
    }
}
var armExplorer;
(function (armExplorer) {
    angular.module('mp.resizer', []).directive('resizer', function ($document) {
        return function ($scope, $element, $attrs) {
            $element.on('mousedown', function (event) {
                event.preventDefault();
                $document.on('mousemove', mousemove);
                $document.on('mouseup', mouseup);
            });
            function mousemove(event) {
                if ($attrs.resizer == 'vertical') {
                    var x = event.pageX;
                    if ($attrs.resizerMax && x > $attrs.resizerMax) {
                        x = parseInt($attrs.resizerMax);
                    }
                    $element.css({
                        left: x + 'px'
                    });
                    $($attrs.resizerLeft).css({
                        width: x + 'px'
                    });
                    $($attrs.resizerRight).css({
                        left: (x + parseInt($attrs.resizerWidth)) + 'px'
                    });
                }
                else {
                    var y = window.innerHeight - event.pageY;
                    $element.css({
                        bottom: y + 'px'
                    });
                    $($attrs.resizerTop).css({
                        bottom: (y + parseInt($attrs.resizerHeight)) + 'px'
                    });
                    $($attrs.resizerBottom).css({
                        height: y + 'px'
                    });
                }
            }
            function mouseup() {
                $document.unbind('mousemove', mousemove);
                $document.unbind('mouseup', mouseup);
            }
        };
    });
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    let ARMUrlParts;
    (function (ARMUrlParts) {
        ARMUrlParts[ARMUrlParts["Protocol"] = 0] = "Protocol";
        ARMUrlParts[ARMUrlParts["Blank"] = 1] = "Blank";
        ARMUrlParts[ARMUrlParts["DomainName"] = 2] = "DomainName";
        ARMUrlParts[ARMUrlParts["SubscriptionsKey"] = 3] = "SubscriptionsKey";
        ARMUrlParts[ARMUrlParts["SubscriptionsValue"] = 4] = "SubscriptionsValue";
        ARMUrlParts[ARMUrlParts["ResourceGroupsKey"] = 5] = "ResourceGroupsKey";
        ARMUrlParts[ARMUrlParts["ResourceGroupsValue"] = 6] = "ResourceGroupsValue";
        ARMUrlParts[ARMUrlParts["ProviderKey"] = 7] = "ProviderKey";
        ARMUrlParts[ARMUrlParts["ProviderValue"] = 8] = "ProviderValue";
        ARMUrlParts[ARMUrlParts["ResourceType1Name"] = 9] = "ResourceType1Name";
        ARMUrlParts[ARMUrlParts["ResourceType1Value"] = 10] = "ResourceType1Value";
    })(ARMUrlParts || (ARMUrlParts = {}));
    class ARMUrlParser {
        constructor(value, actions) {
            this.value = value;
            this.actions = actions;
            this.originalUrl = "";
            this.url = "";
            this.urlParts = [];
            this.url = value.url;
            this.originalUrl = value.url;
            if (this.isSecureGet(this.value.httpMethod, this.url)) {
                this.url = this.value.url.replace("/list", "");
            }
            this.urlParts = this.url.split("/");
        }
        isSecureGet(httpMethod, url) {
            return (httpMethod.toLowerCase() === armExplorer.HttpVerb[armExplorer.HttpVerb.POST].toLowerCase()) && url.toLowerCase().endsWith("/list");
        }
        hasResourceType() {
            return this.urlParts.length > ARMUrlParts.ResourceType1Name;
        }
        hasResourceName() {
            return this.urlParts.length > ARMUrlParts.ResourceType1Value;
        }
        getSubscriptionId() {
            return this.urlParts[ARMUrlParts.SubscriptionsValue];
        }
        getResourceGroup() {
            return this.urlParts[ARMUrlParts.ResourceGroupsValue];
        }
        getAPIVersion() {
            return this.value.resourceDefinition.apiVersion;
        }
        getURL() {
            return this.value.url;
        }
        getResourceDefinitionChildren() {
            return this.value.resourceDefinition.children;
        }
        getOriginalURL() {
            return this.originalUrl;
        }
        getHttpMethod() {
            return this.value.httpMethod;
        }
        getActions() {
            return this.actions;
        }
        getResourceActions() {
            return this.value.resourceDefinition.actions;
        }
        hasResourceProvider() {
            return this.urlParts.length > ARMUrlParts.ProviderKey;
        }
        isResourceGroupURL() {
            return this.urlParts.length === (ARMUrlParts.ResourceGroupsKey + 1);
        }
        getResourceIdentifier() {
            let resourceIdentifier = {};
            if (!this.hasResourceType()) {
                resourceIdentifier.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithIDOnly;
                resourceIdentifier.resourceId = this.url.replace("https://management.azure.com", "");
            }
            else {
                resourceIdentifier.resourceGroup = this.urlParts[ARMUrlParts.ResourceGroupsValue];
                resourceIdentifier.resourceType = this.urlParts[ARMUrlParts.ProviderValue] + "/" + this.urlParts[ARMUrlParts.ResourceType1Name];
                resourceIdentifier.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithGroupType;
                if (this.hasResourceName()) {
                    resourceIdentifier.resourceName = this.urlParts[ARMUrlParts.ResourceType1Value];
                    resourceIdentifier.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithGroupTypeName;
                }
                for (let i = ARMUrlParts.ResourceType1Value + 1; i < this.urlParts.length; i++) {
                    if (i % 2 === 1) {
                        resourceIdentifier.resourceType += ("/" + this.urlParts[i]);
                    }
                    else {
                        resourceIdentifier.resourceName += ("/" + this.urlParts[i]);
                    }
                }
            }
            return resourceIdentifier;
        }
    }
    armExplorer.ARMUrlParser = ARMUrlParser;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    class ScriptParametersResolver {
        constructor(urlParser) {
            this.urlParser = urlParser;
            this.supportedCommands = [];
            this.fillSupportedCommands();
        }
        fillSupportedCommands() {
            let resourceActions = this.urlParser.getResourceActions();
            if (this.urlParser.getHttpMethod().contains(armExplorer.HttpVerb[armExplorer.HttpVerb.GET], true)) {
                this.supportedCommands.push({ cmd: CmdType.Get, isAction: false, isSetAction: false });
            }
            else if (this.urlParser.getHttpMethod().contains(armExplorer.HttpVerb[armExplorer.HttpVerb.POST], true) && this.urlParser.getOriginalURL().contains("list", true)) {
                this.supportedCommands.push({ cmd: CmdType.Invoke, isAction: false, isSetAction: false });
            }
            if (resourceActions.some(a => (a.toUpperCase() === armExplorer.ResourceActions[armExplorer.ResourceActions.PATCH] || a.toUpperCase() === armExplorer.ResourceActions[armExplorer.ResourceActions.PUT]))) {
                if (resourceActions.includes(armExplorer.ResourceActions[armExplorer.ResourceActions.GET])) {
                    this.supportedCommands.push({ cmd: CmdType.Set, isAction: false, isSetAction: true });
                }
                else {
                    this.supportedCommands.push({ cmd: CmdType.New, isAction: false, isSetAction: true });
                }
            }
            if (resourceActions.includes(armExplorer.ResourceActions[armExplorer.ResourceActions.CREATE])) {
                if (this.urlParser.isResourceGroupURL()) {
                    this.supportedCommands.push({ cmd: CmdType.NewResourceGroup, isAction: false, isSetAction: false });
                }
                else {
                    this.supportedCommands.push({ cmd: CmdType.New, isAction: false, isSetAction: false });
                }
            }
            if (this.urlParser.getActions().length > 0) {
                this.urlParser.getActions().forEach(action => {
                    if (action.httpMethod.toUpperCase() === armExplorer.HttpVerb[armExplorer.HttpVerb.DELETE]) {
                        this.supportedCommands.push({ cmd: CmdType.RemoveAction, isAction: true, isSetAction: false });
                    }
                    else if (action.httpMethod.toUpperCase() === armExplorer.HttpVerb[armExplorer.HttpVerb.POST]) {
                        this.supportedCommands.push({ cmd: CmdType.InvokeAction, isAction: true, isSetAction: false });
                    }
                });
            }
        }
        getResourceGroup() {
            return this.urlParser.getResourceGroup();
        }
        getSubscriptionId() {
            return this.urlParser.getSubscriptionId();
        }
        getCompleteResourceId() {
            return this.urlParser.getOriginalURL().substring(this.urlParser.getOriginalURL().indexOf("/subscriptions"));
        }
        getSupportedCommands() {
            return this.supportedCommands;
        }
        doGetActionName(url) {
            return url.substr(url.lastIndexOf("/") + 1, url.length - url.lastIndexOf("/") - 1);
        }
        getActionName() {
            return this.doGetActionName(this.urlParser.getURL());
        }
        getActionParameters(actionIndex) {
            return this.urlParser.getActions()[actionIndex];
        }
        getActionNameFromAction(actionIndex) {
            return this.doGetActionName(this.getActionParameters(actionIndex).url);
        }
        getActionNameFromList() {
            return this.doGetActionName(this.urlParser.getURL().replace("/list", ""));
        }
        getResourceName() {
            return this.urlParser.getURL().substr(this.urlParser.getURL().lastIndexOf("/") + 1, this.urlParser.getURL().length - this.urlParser.getURL().lastIndexOf("/") - 2);
        }
        supportsCollection(resourceName) {
            return !!(!resourceName && (typeof this.urlParser.getResourceDefinitionChildren() === "string")) && this.urlParser.hasResourceProvider();
        }
        getParameters() {
            let cmd = {};
            cmd.apiVersion = this.urlParser.getAPIVersion();
            cmd.resourceIdentifier = this.urlParser.getResourceIdentifier();
            cmd.isCollection = this.supportsCollection(cmd.resourceIdentifier.resourceName);
            return cmd;
        }
    }
    armExplorer.ScriptParametersResolver = ScriptParametersResolver;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    class ScriptInternals {
        static init() {
            if (!this.initialized) {
                this.initialized = true;
                this.classNameMap.push([armExplorer.CliResourceType.Subscriptions, "Subscriptions"]);
                this.classNameMap.push([armExplorer.CliResourceType.Subscription, "Subscription"]);
                this.classNameMap.push([armExplorer.CliResourceType.SubscriptionLocations, "SubscriptionLocations"]);
                this.classNameMap.push([armExplorer.CliResourceType.ResourceGroups, "ResourceGroups"]);
                this.classNameMap.push([armExplorer.CliResourceType.ResourceGroup, "ResourceGroup"]);
                this.classNameMap.push([armExplorer.CliResourceType.WebApps, "WebApps"]);
                this.classNameMap.push([armExplorer.CliResourceType.WebApp, "WebApp"]);
                this.classNameMap.push([armExplorer.CliResourceType.GenericResource, "GenericResource"]);
                this.psToCliActionMap.push([CmdType.Get, armExplorer.ResourceAction.Get]);
                this.psToCliActionMap.push([CmdType.Invoke, armExplorer.ResourceAction.Invoke]);
                this.psToCliActionMap.push([CmdType.InvokeAction, armExplorer.ResourceAction.InvokeAction]);
                this.psToCliActionMap.push([CmdType.Set, armExplorer.ResourceAction.Set]);
                this.psToCliActionMap.push([CmdType.New, armExplorer.ResourceAction.New]);
                this.psToCliActionMap.push([CmdType.RemoveAction, armExplorer.ResourceAction.RemoveAction]);
                this.psToCliActionMap.push([CmdType.NewResourceGroup, armExplorer.ResourceAction.NewResourceGroup]);
            }
        }
        static getClassName(resType) {
            return this.classNameMap.find(item => item[0] === resType)[1];
        }
        static getCliResourceType(cmdType) {
            return this.psToCliActionMap.find(item => item[0] === cmdType)[1];
        }
    }
    ScriptInternals.classNameMap = [];
    ScriptInternals.psToCliActionMap = [];
    ScriptInternals.initialized = false;
    armExplorer.ScriptInternals = ScriptInternals;
    function getAzureCliScriptsForResource(value) {
        const parser = new armExplorer.ARMUrlParser(value, []);
        const resolver = new armExplorer.ScriptParametersResolver(parser);
        const resourceHandlerResolver = new armExplorer.ResourceHandlerResolver(resolver);
        const scriptGenerator = new armExplorer.CliScriptGenerator(resolver, resourceHandlerResolver);
        return scriptGenerator.getScript();
    }
    armExplorer.getAzureCliScriptsForResource = getAzureCliScriptsForResource;
    function getPowerShellScriptsForResource(value, actions) {
        var script = "# PowerShell equivalent script\n\n";
        let urlParser = new armExplorer.ARMUrlParser(value, actions);
        let parameterResolver = new armExplorer.ScriptParametersResolver(urlParser);
        let scriptGenerator = new armExplorer.PowerShellScriptGenerator(parameterResolver);
        for (let cmd of parameterResolver.getSupportedCommands()) {
            script += scriptGenerator.getScript(cmd);
        }
        return script;
    }
    armExplorer.getPowerShellScriptsForResource = getPowerShellScriptsForResource;
    function getAnsibleScriptsForResource(value, actions, resourceDefinition) {
        var script = "# Ansible Playbooks\n\n";
        let urlParser = new armExplorer.ARMUrlParser(value, actions);
        let parameterResolver = new armExplorer.ScriptParametersResolver(urlParser);
        let scriptGenerator = new armExplorer.AnsibleScriptGenerator(parameterResolver, resourceDefinition);
        for (let cmd of parameterResolver.getSupportedCommands()) {
            script += scriptGenerator.getScript(cmd);
        }
        return script;
    }
    armExplorer.getAnsibleScriptsForResource = getAnsibleScriptsForResource;
})(armExplorer || (armExplorer = {}));
function strEnum(strings) {
    return strings.reduce((res, key) => {
        res[key[0]] = key[1];
        return res;
    }, Object.create(null));
}
const CmdType = strEnum([
    ["Get", "Get-AzureRmResource"],
    ["Invoke", "Invoke-AzureRmResourceAction"],
    ["InvokeAction", "Invoke-AzureRmResourceAction"],
    ["Set", "Set-AzureRmResource"],
    ["New", "New-AzureRmResource"],
    ["RemoveAction", "Remove-AzureRmResource"],
    ["NewResourceGroup", "New-AzureRmResourceGroup"]
]);
(function (armExplorer) {
    let CliResourceType;
    (function (CliResourceType) {
        CliResourceType[CliResourceType["Subscriptions"] = 0] = "Subscriptions";
        CliResourceType[CliResourceType["Subscription"] = 1] = "Subscription";
        CliResourceType[CliResourceType["SubscriptionLocations"] = 2] = "SubscriptionLocations";
        CliResourceType[CliResourceType["ResourceGroups"] = 3] = "ResourceGroups";
        CliResourceType[CliResourceType["ResourceGroup"] = 4] = "ResourceGroup";
        CliResourceType[CliResourceType["WebApps"] = 5] = "WebApps";
        CliResourceType[CliResourceType["WebApp"] = 6] = "WebApp";
        CliResourceType[CliResourceType["GenericResource"] = 7] = "GenericResource";
    })(CliResourceType = armExplorer.CliResourceType || (armExplorer.CliResourceType = {}));
    let ResourceIdentifierType;
    (function (ResourceIdentifierType) {
        ResourceIdentifierType[ResourceIdentifierType["WithIDOnly"] = 0] = "WithIDOnly";
        ResourceIdentifierType[ResourceIdentifierType["WithGroupType"] = 1] = "WithGroupType";
        ResourceIdentifierType[ResourceIdentifierType["WithGroupTypeName"] = 2] = "WithGroupTypeName";
    })(ResourceIdentifierType = armExplorer.ResourceIdentifierType || (armExplorer.ResourceIdentifierType = {}));
    let ResourceAction;
    (function (ResourceAction) {
        ResourceAction[ResourceAction["Get"] = 0] = "Get";
        ResourceAction[ResourceAction["Invoke"] = 1] = "Invoke";
        ResourceAction[ResourceAction["InvokeAction"] = 2] = "InvokeAction";
        ResourceAction[ResourceAction["Set"] = 3] = "Set";
        ResourceAction[ResourceAction["New"] = 4] = "New";
        ResourceAction[ResourceAction["RemoveAction"] = 5] = "RemoveAction";
        ResourceAction[ResourceAction["NewResourceGroup"] = 6] = "NewResourceGroup";
    })(ResourceAction = armExplorer.ResourceAction || (armExplorer.ResourceAction = {}));
    let ResourceActions;
    (function (ResourceActions) {
        ResourceActions[ResourceActions["PATCH"] = 0] = "PATCH";
        ResourceActions[ResourceActions["PUT"] = 1] = "PUT";
        ResourceActions[ResourceActions["GET"] = 2] = "GET";
        ResourceActions[ResourceActions["CREATE"] = 3] = "CREATE";
    })(ResourceActions = armExplorer.ResourceActions || (armExplorer.ResourceActions = {}));
    let HttpVerb;
    (function (HttpVerb) {
        HttpVerb[HttpVerb["GET"] = 0] = "GET";
        HttpVerb[HttpVerb["POST"] = 1] = "POST";
        HttpVerb[HttpVerb["DELETE"] = 2] = "DELETE";
    })(HttpVerb = armExplorer.HttpVerb || (armExplorer.HttpVerb = {}));
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    class AnsibleScriptGenerator {
        constructor(resolver, resourceDefinition) {
            this.resolver = resolver;
            this.script = "";
            this.actionsIndex = 0;
            this.resourceDefinition = {};
            this.resourceDefinition = resourceDefinition;
        }
        getScript(cmdActionPair) {
            const cmdParameters = this.resolver.getParameters();
            let currentScript = "";
            currentScript += "- hosts: localhost\n";
            currentScript += "  tasks:\n";
            switch (cmdActionPair.cmd) {
                case CmdType.Get: {
                    currentScript += '    - name: GET ' + this.resolver.getActionName() + '\n';
                    currentScript += '      azure_rm_resource_facts:\n';
                    currentScript += this.yamlFromResourceId(cmdActionPair, "        ");
                    break;
                }
                case CmdType.New: {
                    if (cmdActionPair.isSetAction) {
                        currentScript += '    - name: SET ' + this.resolver.getActionName() + '\n';
                        currentScript += '      azure_rm_resource:\n';
                        currentScript += this.yamlFromResourceId(cmdActionPair, "        ");
                    }
                    else {
                        currentScript += '    - name: CREATE ' + this.resolver.getActionName() + '\n';
                        currentScript += '      azure_rm_resource:\n';
                        currentScript += this.yamlFromResourceId(cmdActionPair, "        ");
                    }
                    if (this.resourceDefinition.requestBody) {
                        currentScript += "        body:\n";
                        currentScript += this.yamlFromObject(this.resourceDefinition.requestBody, "          ");
                    }
                    break;
                }
                case CmdType.Set: {
                    currentScript += '    - name: SET ' + this.resolver.getActionNameFromList() + '\n';
                    currentScript += '      azure_rm_resource:\n';
                    currentScript += this.yamlFromResourceId(cmdActionPair, "        ");
                    if (this.resourceDefinition.requestBody) {
                        currentScript += "        body:\n";
                        currentScript += this.yamlFromObject(this.resourceDefinition.requestBody, "          ");
                    }
                    break;
                }
                case CmdType.RemoveAction: {
                    currentScript += '    - name: DELETE ' + this.resolver.getActionNameFromAction(this.actionsIndex) + '\n';
                    currentScript += '      azure_rm_resource:\n';
                    currentScript += this.yamlFromResourceId(cmdActionPair, "        ");
                    currentScript += "        state: absent\n";
                    this.actionsIndex++;
                    break;
                }
                case CmdType.Invoke:
                case CmdType.InvokeAction: {
                    if (cmdActionPair.isAction) {
                        currentScript += '    - name: Action ' + this.resolver.getActionNameFromAction(this.actionsIndex) + '\n';
                        currentScript += '      azure_rm_resource:\n';
                        currentScript += '        method: POST\n';
                        currentScript += this.yamlFromResourceId(cmdActionPair, "        ");
                        const body = this.resolver.getActionParameters(this.actionsIndex).requestBody;
                        if (body) {
                            currentScript += "        body:\n";
                            currentScript += this.yamlFromObject(JSON.parse(body), "          ");
                        }
                        this.actionsIndex++;
                    }
                    else {
                        currentScript += '    - name: LIST ' + this.resolver.getActionNameFromList() + '\n';
                        currentScript += '      azure_rm_resource:\n';
                        currentScript += this.yamlFromResourceId(cmdActionPair, "        ");
                    }
                    break;
                }
                case CmdType.NewResourceGroup: {
                    currentScript += '    - name: CREATE ' + this.resolver.getActionName() + '\n';
                    currentScript += '      azure_rm_resource:\n';
                    currentScript += "        api_version: '" + cmdParameters.apiVersion + "'\n";
                    currentScript += '        resource_group: NewResourceGroup\n';
                    currentScript += '        body:\n';
                    currentScript += '          location: eastus\n';
                    break;
                }
            }
            return currentScript + "\n\n";
        }
        yamlFromObject(o, prefix) {
            let yaml = "";
            let __this = this;
            for (let key in o) {
                if (typeof o[key] === 'object') {
                    if (Array.isArray(o[key])) {
                        yaml += prefix + key + ":\n";
                        o[key].forEach(function (e) {
                            if (typeof e != 'object') {
                                yaml += prefix + "  - " + e + "\n";
                            }
                            else {
                                yaml += __this.yamlFromObject(e, prefix + "  - ");
                            }
                        });
                    }
                    else {
                        yaml += prefix + key + ":\n";
                        yaml += this.yamlFromObject(o[key], prefix + "  ");
                    }
                }
                else {
                    yaml += prefix + key + ": " + o[key] + "\n";
                }
                if (prefix.indexOf('-') >= 0)
                    prefix = prefix.replace('-', ' ');
            }
            return yaml;
        }
        yamlFromResourceId(cmdActionPair, prefix) {
            let yaml = "";
            const cmdParameters = this.resolver.getParameters();
            switch (cmdParameters.resourceIdentifier.resourceIdentifierType) {
                case armExplorer.ResourceIdentifierType.WithIDOnly: {
                    yaml += prefix + "api_version: '" + cmdParameters.apiVersion + "'\n";
                    yaml += prefix + "url: " + cmdParameters.resourceIdentifier.resourceId + "\n";
                    break;
                }
                case armExplorer.ResourceIdentifierType.WithGroupType: {
                    yaml += prefix + "api_version: '" + cmdParameters.apiVersion + "'\n";
                    yaml += prefix + "resource_group: '" + cmdParameters.resourceIdentifier.resourceGroup + "'\n";
                    yaml += prefix + "provider: '" + cmdParameters.resourceIdentifier.resourceType.split('/')[0].split('.')[1] + "'\n";
                    yaml += prefix + "resource_type: '" + cmdParameters.resourceIdentifier.resourceType.split('/')[1] + "'\n";
                    if (cmdActionPair.cmd == CmdType.New && !cmdActionPair.isSetAction) {
                        yaml += prefix + "resource_name: '{{ name }}'\n";
                    }
                    break;
                }
                case armExplorer.ResourceIdentifierType.WithGroupTypeName: {
                    yaml += prefix + "api_version: '" + cmdParameters.apiVersion + "'\n";
                    yaml += prefix + "resource_group: '" + cmdParameters.resourceIdentifier.resourceGroup + "'\n";
                    yaml += prefix + "provider: '" + cmdParameters.resourceIdentifier.resourceType.split('/')[0].split('.')[1] + "'\n";
                    yaml += prefix + "resource_type: '" + cmdParameters.resourceIdentifier.resourceType.split('/')[1] + "'\n";
                    const split_name = cmdParameters.resourceIdentifier.resourceName.split('/');
                    yaml += prefix + "resource_name: '" + split_name[0] + "'\n";
                    if (split_name.length > 1) {
                        yaml += prefix + "subresource:\n";
                        yaml += prefix + "  - type: " + split_name[1] + "\n";
                    }
                    else if (cmdActionPair.isAction) {
                        yaml += prefix + "subresource:\n";
                        yaml += prefix + "  - type: " + this.resolver.getActionNameFromAction(this.actionsIndex) + "\n";
                    }
                    break;
                }
            }
            return yaml;
        }
    }
    armExplorer.AnsibleScriptGenerator = AnsibleScriptGenerator;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    class CliScriptGenerator {
        constructor(resolver, resourceHandlerResolver) {
            this.resolver = resolver;
            this.resourceHandlerResolver = resourceHandlerResolver;
            armExplorer.ScriptInternals.init();
        }
        getCliResourceType() {
            const resourceId = this.resolver.getCompleteResourceId().toLowerCase();
            if (resourceId.endsWith("/subscriptions")) {
                return armExplorer.CliResourceType.Subscriptions;
            }
            if (resourceId.endsWith("/locations")) {
                return armExplorer.CliResourceType.SubscriptionLocations;
            }
            if (resourceId.endsWith("/resourcegroups")) {
                return armExplorer.CliResourceType.ResourceGroups;
            }
            const resourceIdParts = resourceId.split("/");
            if (resourceIdParts.length === 3) {
                return armExplorer.CliResourceType.Subscription;
            }
            if (resourceIdParts[resourceIdParts.length - 2] === "resourcegroups") {
                return armExplorer.CliResourceType.ResourceGroup;
            }
            if (resourceId.endsWith("/microsoft.web/sites")) {
                return armExplorer.CliResourceType.WebApps;
            }
            const lastIndex = resourceId.lastIndexOf("/");
            if (resourceId.substring(0, lastIndex).endsWith("/microsoft.web/sites")) {
                return armExplorer.CliResourceType.WebApp;
            }
            return armExplorer.CliResourceType.GenericResource;
        }
        getScript() {
            const resourceType = this.getCliResourceType();
            let resourceHandler = this.resourceHandlerResolver.getResourceHandler(resourceType);
            let script = "";
            for (let cmd of this.resolver.getSupportedCommands()) {
                script += resourceHandler.getScript(armExplorer.ScriptInternals.getCliResourceType(cmd.cmd));
            }
            return script;
        }
    }
    armExplorer.CliScriptGenerator = CliScriptGenerator;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    class ResourceHandlerResolver {
        constructor(resolver) {
            this.resolver = resolver;
            armExplorer.ScriptInternals.init();
        }
        getResourceHandler(resType) {
            const resourceClassName = armExplorer.ScriptInternals.getClassName(resType);
            return new window["armExplorer"][resourceClassName](this.resolver);
        }
    }
    armExplorer.ResourceHandlerResolver = ResourceHandlerResolver;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    class GenericResource {
        constructor(resolver) {
            this.resolver = resolver;
        }
        getScript(action) {
            switch (action) {
                case armExplorer.ResourceAction.Get:
                    return `az resource show --id ${this.resolver.getCompleteResourceId()} --api-version ${this.resolver.getParameters().apiVersion}\n\n`;
                case armExplorer.ResourceAction.Invoke:
                    return "";
                case armExplorer.ResourceAction.InvokeAction:
                    return "";
                case armExplorer.ResourceAction.Set:
                    return `az resource update --id ${this.resolver.getCompleteResourceId()} --api-version ${this.resolver.getParameters().apiVersion} --set properties.key=value\n\n`;
                case armExplorer.ResourceAction.New:
                case armExplorer.ResourceAction.NewResourceGroup:
                    return `az resource create --id ${this.resolver.getCompleteResourceId()} --api-version ${this.resolver.getParameters().apiVersion} --properties {}\n\n`;
                case armExplorer.ResourceAction.RemoveAction:
                    return `az resource delete --id ${this.resolver.getCompleteResourceId()} --api-version ${this.resolver.getParameters().apiVersion}\n\n`;
                default:
                    return "";
            }
        }
    }
    armExplorer.GenericResource = GenericResource;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    class ResourceGroup extends armExplorer.GenericResource {
        constructor(resolver) {
            super(resolver);
        }
        getScript(action) {
            let script = "";
            switch (action) {
                case armExplorer.ResourceAction.Get:
                    script = `az group show --name "${this.resolver.getResourceGroup()}"\n\n`;
                    break;
                case armExplorer.ResourceAction.NewResourceGroup:
                    script = "az group create --location westus --name NewResourceGroupName\n\n";
                    break;
                case armExplorer.ResourceAction.Invoke:
                    break;
                case armExplorer.ResourceAction.InvokeAction:
                    break;
                case armExplorer.ResourceAction.Set:
                    script = `az group update --name "${this.resolver.getResourceGroup()}" <properties>\n\n`;
                    break;
                case armExplorer.ResourceAction.New:
                    break;
                case armExplorer.ResourceAction.RemoveAction:
                    script = `az group delete --name "${this.resolver.getResourceGroup()}"\n\n`;
                    break;
                default:
                    break;
            }
            return script === "" ? super.getScript(action) : script;
        }
    }
    armExplorer.ResourceGroup = ResourceGroup;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    class ResourceGroups extends armExplorer.GenericResource {
        constructor(resolver) {
            super(resolver);
        }
        getScript(action) {
            let script = "";
            switch (action) {
                case armExplorer.ResourceAction.Get:
                    script = "az group list\n\n";
                    break;
                case armExplorer.ResourceAction.NewResourceGroup:
                    script = "az group create --location westus --name NewResourceGroupName\n\n";
                    break;
                case armExplorer.ResourceAction.Invoke:
                case armExplorer.ResourceAction.InvokeAction:
                case armExplorer.ResourceAction.Set:
                case armExplorer.ResourceAction.New:
                case armExplorer.ResourceAction.RemoveAction:
                default:
                    break;
            }
            return script === "" ? super.getScript(action) : script;
        }
    }
    armExplorer.ResourceGroups = ResourceGroups;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    class Subscription extends armExplorer.GenericResource {
        constructor(resolver) {
            super(resolver);
        }
        getScript(action) {
            let script = "";
            switch (action) {
                case armExplorer.ResourceAction.Get:
                    script = `az account show --subscription ${this.resolver.getSubscriptionId()}\n\n`;
                    break;
                case armExplorer.ResourceAction.Invoke:
                case armExplorer.ResourceAction.InvokeAction:
                case armExplorer.ResourceAction.Set:
                case armExplorer.ResourceAction.New:
                case armExplorer.ResourceAction.NewResourceGroup:
                case armExplorer.ResourceAction.RemoveAction:
                default:
                    break;
            }
            return script === "" ? super.getScript(action) : script;
        }
    }
    armExplorer.Subscription = Subscription;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    class SubscriptionLocations extends armExplorer.GenericResource {
        constructor(resolver) {
            super(resolver);
        }
        getScript(action) {
            let script = "";
            switch (action) {
                case armExplorer.ResourceAction.Get:
                    script = "az account list-locations\n\n";
                    break;
                case armExplorer.ResourceAction.Invoke:
                case armExplorer.ResourceAction.InvokeAction:
                case armExplorer.ResourceAction.Set:
                case armExplorer.ResourceAction.New:
                case armExplorer.ResourceAction.NewResourceGroup:
                case armExplorer.ResourceAction.RemoveAction:
                default:
                    break;
            }
            return script === "" ? super.getScript(action) : script;
        }
    }
    armExplorer.SubscriptionLocations = SubscriptionLocations;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    class Subscriptions extends armExplorer.GenericResource {
        constructor(resolver) {
            super(resolver);
        }
        getScript(action) {
            let script = "";
            switch (action) {
                case armExplorer.ResourceAction.Get:
                    script = "az account list\n\n";
                    break;
                case armExplorer.ResourceAction.Invoke:
                case armExplorer.ResourceAction.InvokeAction:
                case armExplorer.ResourceAction.Set:
                case armExplorer.ResourceAction.New:
                case armExplorer.ResourceAction.NewResourceGroup:
                case armExplorer.ResourceAction.RemoveAction:
                default:
                    break;
            }
            return script === "" ? super.getScript(action) : script;
        }
    }
    armExplorer.Subscriptions = Subscriptions;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    class WebApp extends armExplorer.GenericResource {
        constructor(resolver) {
            super(resolver);
        }
        getScript(action) {
            let script = "";
            switch (action) {
                case armExplorer.ResourceAction.Get:
                    script = `az webapp show --name "${this.resolver.getParameters().resourceIdentifier.resourceName}" --resource-group "${this.resolver.getResourceGroup()}"\n\n`;
                    break;
                case armExplorer.ResourceAction.NewResourceGroup:
                    break;
                case armExplorer.ResourceAction.Invoke:
                    break;
                case armExplorer.ResourceAction.InvokeAction:
                    break;
                case armExplorer.ResourceAction.Set:
                    break;
                case armExplorer.ResourceAction.New:
                    script = `az webapp create --resource-group "${this.resolver.getResourceGroup()}" --plan planName --name NewWebAppName\n\n`;
                    break;
                case armExplorer.ResourceAction.RemoveAction:
                    script = `az webapp delete --name "${this.resolver.getParameters().resourceIdentifier.resourceName}" --resource-group "${this.resolver.getResourceGroup()}"\n\n`;
                    break;
                default:
                    break;
            }
            return script === "" ? super.getScript(action) : script;
        }
    }
    armExplorer.WebApp = WebApp;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    class WebApps extends armExplorer.GenericResource {
        constructor(resolver) {
            super(resolver);
        }
        getScript(action) {
            let script = "";
            switch (action) {
                case armExplorer.ResourceAction.Get:
                    script = `az webapp list --resource-group "${this.resolver.getResourceGroup()}"\n\n`;
                    break;
                case armExplorer.ResourceAction.NewResourceGroup:
                    break;
                case armExplorer.ResourceAction.Invoke:
                    break;
                case armExplorer.ResourceAction.InvokeAction:
                    break;
                case armExplorer.ResourceAction.Set:
                    break;
                case armExplorer.ResourceAction.New:
                    script = `az webapp create --resource-group "${this.resolver.getResourceGroup()}" --plan planName --name NewWebAppName\n\n`;
                    break;
                case armExplorer.ResourceAction.RemoveAction:
                    break;
                default:
                    break;
            }
            return script === "" ? super.getScript(action) : script;
        }
    }
    armExplorer.WebApps = WebApps;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    class PowerShellScriptGenerator {
        constructor(resolver) {
            this.resolver = resolver;
            this.script = "";
            this.actionsIndex = 0;
        }
        getPrefix(commandInfo) {
            let prefixString = "";
            switch (commandInfo.cmd) {
                case CmdType.Get: {
                    prefixString = '# GET ' + this.resolver.getActionName() + "\n";
                    break;
                }
                case CmdType.NewResourceGroup: {
                    prefixString += '# CREATE ' + this.resolver.getActionName() + "\n";
                    prefixString += '$ResourceLocation = "West US"\n';
                    prefixString += '$ResourceName = "NewresourceGroup"\n\n';
                    break;
                }
                case CmdType.RemoveAction: {
                    prefixString = `# DELETE ${this.resolver.getActionNameFromAction(this.actionsIndex)}\n`;
                    break;
                }
                case CmdType.Set: {
                    prefixString = `# SET ${this.resolver.getActionNameFromList()}\n$PropertiesObject = @{\n\t#Property = value;\n}\n`;
                    break;
                }
                case CmdType.Invoke:
                case CmdType.InvokeAction: {
                    if (commandInfo.isAction) {
                        let currentAction = this.resolver.getActionParameters(this.actionsIndex);
                        let parametersObject = currentAction.requestBody ? (`$ParametersObject = ${ObjectUtils.getPsObjectFromJson(currentAction.requestBody, 0)}\n`) : '';
                        prefixString = `# Action ${this.resolver.getActionNameFromAction(this.actionsIndex)}\n${parametersObject}`;
                    }
                    else {
                        prefixString = `# LIST ${this.resolver.getActionNameFromList()}\n`;
                    }
                    break;
                }
                case CmdType.New: {
                    if (commandInfo.isSetAction) {
                        prefixString = `# SET ${this.resolver.getActionName()}\n$PropertiesObject = @{\n\t#Property = value;\n}\n`;
                    }
                    else {
                        let newName = "New" + this.resolver.getResourceName();
                        prefixString = `# CREATE ${this.resolver.getActionName()}\n$ResourceLocation = "West US"\n$ResourceName = "${newName}"\n$PropertiesObject = @{\n\t#Property = value;\n}\n`;
                    }
                    break;
                }
            }
            return prefixString;
        }
        getScript(cmdActionPair) {
            let cmdParameters = this.resolver.getParameters();
            let currentScript = "";
            let scriptPrefix = this.getPrefix(cmdActionPair);
            switch (cmdActionPair.cmd) {
                case CmdType.Get: {
                    switch (cmdParameters.resourceIdentifier.resourceIdentifierType) {
                        case armExplorer.ResourceIdentifierType.WithIDOnly: {
                            if (cmdParameters.isCollection) {
                                currentScript = `${cmdActionPair.cmd} -ResourceId ${cmdParameters.resourceIdentifier.resourceId} -IsCollection -ApiVersion ${cmdParameters.apiVersion}`;
                            }
                            else {
                                currentScript = `${cmdActionPair.cmd} -ResourceId ${cmdParameters.resourceIdentifier.resourceId} -ApiVersion ${cmdParameters.apiVersion}`;
                            }
                            break;
                        }
                        case armExplorer.ResourceIdentifierType.WithGroupType: {
                            if (cmdParameters.isCollection) {
                                currentScript = `${cmdActionPair.cmd} -ResourceGroupName ${cmdParameters.resourceIdentifier.resourceGroup} -ResourceType ${cmdParameters.resourceIdentifier.resourceType} -IsCollection -ApiVersion ${cmdParameters.apiVersion}`;
                            }
                            else {
                                currentScript = `${cmdActionPair.cmd} -ResourceGroupName ${cmdParameters.resourceIdentifier.resourceGroup} -ResourceType ${cmdParameters.resourceIdentifier.resourceType} -ApiVersion ${cmdParameters.apiVersion}`;
                            }
                            break;
                        }
                        case armExplorer.ResourceIdentifierType.WithGroupTypeName: {
                            if (cmdParameters.isCollection) {
                                currentScript = `${cmdActionPair.cmd} -ResourceGroupName ${cmdParameters.resourceIdentifier.resourceGroup} -ResourceType ${cmdParameters.resourceIdentifier.resourceType} -ResourceName "${cmdParameters.resourceIdentifier.resourceName}" -IsCollection -ApiVersion ${cmdParameters.apiVersion}`;
                            }
                            else {
                                currentScript = `${cmdActionPair.cmd} -ResourceGroupName ${cmdParameters.resourceIdentifier.resourceGroup} -ResourceType ${cmdParameters.resourceIdentifier.resourceType} -ResourceName "${cmdParameters.resourceIdentifier.resourceName}" -ApiVersion ${cmdParameters.apiVersion}`;
                            }
                            break;
                        }
                    }
                    break;
                }
                case CmdType.New: {
                    if (cmdActionPair.isSetAction) {
                        switch (cmdParameters.resourceIdentifier.resourceIdentifierType) {
                            case armExplorer.ResourceIdentifierType.WithIDOnly: {
                                console.log("Attempt to create resource with pre existing id");
                                break;
                            }
                            case armExplorer.ResourceIdentifierType.WithGroupType: {
                                currentScript = `${cmdActionPair.cmd} -PropertyObject $PropertiesObject -ResourceGroupName ${cmdParameters.resourceIdentifier.resourceGroup} -ResourceType ${cmdParameters.resourceIdentifier.resourceType} -ApiVersion ${cmdParameters.apiVersion} -Force`;
                                break;
                            }
                            case armExplorer.ResourceIdentifierType.WithGroupTypeName: {
                                currentScript = `${cmdActionPair.cmd} -PropertyObject $PropertiesObject -ResourceGroupName ${cmdParameters.resourceIdentifier.resourceGroup} -ResourceType ${cmdParameters.resourceIdentifier.resourceType} -ResourceName "${cmdParameters.resourceIdentifier.resourceName}" -ApiVersion ${cmdParameters.apiVersion} -Force`;
                                break;
                            }
                        }
                    }
                    else {
                        switch (cmdParameters.resourceIdentifier.resourceIdentifierType) {
                            case armExplorer.ResourceIdentifierType.WithIDOnly: {
                                console.log("Attempt to create resource with pre existing id");
                                break;
                            }
                            case armExplorer.ResourceIdentifierType.WithGroupType: {
                                currentScript = `${cmdActionPair.cmd} -ResourceName $ResourceName -Location $ResourceLocation -PropertyObject $PropertiesObject -ResourceGroupName ${cmdParameters.resourceIdentifier.resourceGroup} -ResourceType ${cmdParameters.resourceIdentifier.resourceType} -ApiVersion ${cmdParameters.apiVersion} -Force`;
                                break;
                            }
                            case armExplorer.ResourceIdentifierType.WithGroupTypeName: {
                                currentScript = `${cmdActionPair.cmd} -Location $ResourceLocation -PropertyObject $PropertiesObject -ResourceGroupName ${cmdParameters.resourceIdentifier.resourceGroup} -ResourceType ${cmdParameters.resourceIdentifier.resourceType} -ResourceName "${cmdParameters.resourceIdentifier.resourceName}/$ResourceName" -ApiVersion ${cmdParameters.apiVersion} -Force`;
                                break;
                            }
                        }
                    }
                    break;
                }
                case CmdType.Set: {
                    switch (cmdParameters.resourceIdentifier.resourceIdentifierType) {
                        case armExplorer.ResourceIdentifierType.WithIDOnly: {
                            currentScript = `${cmdActionPair.cmd} -PropertyObject $PropertiesObject -ResourceId ${cmdParameters.resourceIdentifier.resourceId} -ApiVersion ${cmdParameters.apiVersion} -Force`;
                            break;
                        }
                        case armExplorer.ResourceIdentifierType.WithGroupType: {
                            currentScript = `${cmdActionPair.cmd} -PropertyObject $PropertiesObject -ResourceGroupName ${cmdParameters.resourceIdentifier.resourceGroup} -ResourceType ${cmdParameters.resourceIdentifier.resourceType} -ApiVersion ${cmdParameters.apiVersion} -Force`;
                            break;
                        }
                        case armExplorer.ResourceIdentifierType.WithGroupTypeName: {
                            currentScript = `${cmdActionPair.cmd} -PropertyObject $PropertiesObject -ResourceGroupName ${cmdParameters.resourceIdentifier.resourceGroup} -ResourceType ${cmdParameters.resourceIdentifier.resourceType} -ResourceName "${cmdParameters.resourceIdentifier.resourceName}" -ApiVersion ${cmdParameters.apiVersion} -Force`;
                            break;
                        }
                    }
                    break;
                }
                case CmdType.RemoveAction: {
                    switch (cmdParameters.resourceIdentifier.resourceIdentifierType) {
                        case armExplorer.ResourceIdentifierType.WithIDOnly: {
                            currentScript = `${cmdActionPair.cmd} -ResourceId ${cmdParameters.resourceIdentifier.resourceId} -ApiVersion ${cmdParameters.apiVersion} -Force`;
                            break;
                        }
                        case armExplorer.ResourceIdentifierType.WithGroupType: {
                            currentScript = `${cmdActionPair.cmd} -ResourceGroupName ${cmdParameters.resourceIdentifier.resourceGroup} -ResourceType ${cmdParameters.resourceIdentifier.resourceType} -ApiVersion ${cmdParameters.apiVersion} -Force`;
                            break;
                        }
                        case armExplorer.ResourceIdentifierType.WithGroupTypeName: {
                            currentScript = `${cmdActionPair.cmd} -ResourceGroupName ${cmdParameters.resourceIdentifier.resourceGroup} -ResourceType ${cmdParameters.resourceIdentifier.resourceType} -ResourceName "${cmdParameters.resourceIdentifier.resourceName}" -ApiVersion ${cmdParameters.apiVersion} -Force`;
                            break;
                        }
                    }
                    this.actionsIndex++;
                    break;
                }
                case CmdType.Invoke:
                case CmdType.InvokeAction: {
                    if (cmdActionPair.isAction) {
                        let currentAction = this.resolver.getActionParameters(this.actionsIndex++);
                        let parameters = currentAction.requestBody ? "-Parameters $ParametersObject" : "";
                        switch (cmdParameters.resourceIdentifier.resourceIdentifierType) {
                            case armExplorer.ResourceIdentifierType.WithIDOnly: {
                                currentScript = `${cmdActionPair.cmd} -ResourceId ${cmdParameters.resourceIdentifier.resourceId} -Action ${currentAction.name} ${parameters} -ApiVersion ${cmdParameters.apiVersion} -Force`;
                                break;
                            }
                            case armExplorer.ResourceIdentifierType.WithGroupType: {
                                currentScript = `${cmdActionPair.cmd} -ResourceGroupName ${cmdParameters.resourceIdentifier.resourceGroup} -ResourceType ${cmdParameters.resourceIdentifier.resourceType} -Action ${currentAction.name} ${parameters} -ApiVersion ${cmdParameters.apiVersion} -Force`;
                                break;
                            }
                            case armExplorer.ResourceIdentifierType.WithGroupTypeName: {
                                currentScript = `${cmdActionPair.cmd} -ResourceGroupName ${cmdParameters.resourceIdentifier.resourceGroup} -ResourceType ${cmdParameters.resourceIdentifier.resourceType} -ResourceName ${cmdParameters.resourceIdentifier.resourceName} -Action ${currentAction.name} ${parameters} -ApiVersion ${cmdParameters.apiVersion} -Force`;
                                break;
                            }
                        }
                    }
                    else {
                        switch (cmdParameters.resourceIdentifier.resourceIdentifierType) {
                            case armExplorer.ResourceIdentifierType.WithIDOnly: {
                                currentScript = `$resource = ${cmdActionPair.cmd} -ResourceId ${cmdParameters.resourceIdentifier.resourceId} -Action list -ApiVersion ${cmdParameters.apiVersion} -Force\n$resource.Properties`;
                                break;
                            }
                            case armExplorer.ResourceIdentifierType.WithGroupType: {
                                currentScript = `$resource = ${cmdActionPair.cmd} -ResourceGroupName ${cmdParameters.resourceIdentifier.resourceGroup} -ResourceType ${cmdParameters.resourceIdentifier.resourceType} -Action list -ApiVersion ${cmdParameters.apiVersion} -Force\n$resource.Properties`;
                                break;
                            }
                            case armExplorer.ResourceIdentifierType.WithGroupTypeName: {
                                currentScript = `$resource = ${cmdActionPair.cmd} -ResourceGroupName ${cmdParameters.resourceIdentifier.resourceGroup} -ResourceType ${cmdParameters.resourceIdentifier.resourceType} -ResourceName "${cmdParameters.resourceIdentifier.resourceName}" -Action list -ApiVersion ${cmdParameters.apiVersion} -Force\n$resource.Properties`;
                                break;
                            }
                        }
                    }
                    break;
                }
                case CmdType.NewResourceGroup: {
                    currentScript += `${cmdActionPair.cmd} -Location $ResourceLocation -Name $ResourceName`;
                    break;
                }
            }
            return scriptPrefix + currentScript + "\n\n";
        }
    }
    armExplorer.PowerShellScriptGenerator = PowerShellScriptGenerator;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    let ARMUrlParserTests;
    (function (ARMUrlParserTests) {
        parseUrlWithResourceIDOnly();
        parseUrlWithResouceIDOnlyWithSubId();
        parseUrlWithResourceIDOnlyWithResourceGroup();
        parseUrlWithResourceIDOnlyWithResourceGroupName();
        parseUrlWithResGrpNameResType();
        parseUrlWithResGrpNameResTypeResName();
        parseUrlWithResGrpNameResTypeResNameSubType1();
        parseUrlWithResGrpNameResTypeResNameSubType1SubName1();
        parseUrlWithResGrpNameResTypeResNameSubType1SubName1SubType2();
        parseUrlWithResGrpNameResTypeResNameSubType1SubName1SubType2SubName2();
        parseUrlWithResGrpNameResTypeResNameSubType1SubName1SubType2SubName2SubType3();
        parseUrlWithResGrpNameResTypeResNameSubType1SubName1SubType2SubName2SubType3SubName3();
        parseUrlWithResourceUrlWithList();
        function parseUrlWithResourceIDOnly() {
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions";
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithIDOnly, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("/subscriptions", resourceIdentifier.resourceId);
            armExplorer.throwIfDefined(resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceGroup);
            armExplorer.throwIfDefined(resourceIdentifier.resourceType);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResouceIDOnlyWithSubId() {
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000";
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithIDOnly, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("/subscriptions/00000000-0000-0000-0000-000000000000", resourceIdentifier.resourceId);
            armExplorer.throwIfDefined(resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceGroup);
            armExplorer.throwIfDefined(resourceIdentifier.resourceType);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResourceIDOnlyWithResourceGroup() {
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups";
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithIDOnly, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups", resourceIdentifier.resourceId);
            armExplorer.throwIfDefined(resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceGroup);
            armExplorer.throwIfDefined(resourceIdentifier.resourceType);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResourceIDOnlyWithResourceGroupName() {
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg";
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithIDOnly, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg", resourceIdentifier.resourceId);
            armExplorer.throwIfDefined(resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceGroup);
            armExplorer.throwIfDefined(resourceIdentifier.resourceType);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResGrpNameResType() {
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames";
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithGroupType, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("cloudsvcrg", resourceIdentifier.resourceGroup);
            armExplorer.throwIfNotEqual("Microsoft.ClassicCompute/domainNames", resourceIdentifier.resourceType);
            armExplorer.throwIfDefined(resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceId);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResGrpNameResTypeResName() {
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc";
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithGroupTypeName, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("cloudsvcrg", resourceIdentifier.resourceGroup);
            armExplorer.throwIfNotEqual("Microsoft.ClassicCompute/domainNames", resourceIdentifier.resourceType);
            armExplorer.throwIfNotEqual("x123cloudsvc", resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceId);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResGrpNameResTypeResNameSubType1() {
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots";
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithGroupTypeName, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("cloudsvcrg", resourceIdentifier.resourceGroup);
            armExplorer.throwIfNotEqual("Microsoft.ClassicCompute/domainNames/slots", resourceIdentifier.resourceType);
            armExplorer.throwIfNotEqual("x123cloudsvc", resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceId);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResGrpNameResTypeResNameSubType1SubName1() {
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production";
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithGroupTypeName, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("cloudsvcrg", resourceIdentifier.resourceGroup);
            armExplorer.throwIfNotEqual("Microsoft.ClassicCompute/domainNames/slots", resourceIdentifier.resourceType);
            armExplorer.throwIfNotEqual("x123cloudsvc/Production", resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceId);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResGrpNameResTypeResNameSubType1SubName1SubType2() {
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles";
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithGroupTypeName, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("cloudsvcrg", resourceIdentifier.resourceGroup);
            armExplorer.throwIfNotEqual("Microsoft.ClassicCompute/domainNames/slots/roles", resourceIdentifier.resourceType);
            armExplorer.throwIfNotEqual("x123cloudsvc/Production", resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceId);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResGrpNameResTypeResNameSubType1SubName1SubType2SubName2() {
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1";
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithGroupTypeName, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("cloudsvcrg", resourceIdentifier.resourceGroup);
            armExplorer.throwIfNotEqual("Microsoft.ClassicCompute/domainNames/slots/roles", resourceIdentifier.resourceType);
            armExplorer.throwIfNotEqual("x123cloudsvc/Production/WorkerRole1", resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceId);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResGrpNameResTypeResNameSubType1SubName1SubType2SubName2SubType3() {
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1/metricDefinitions";
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithGroupTypeName, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("cloudsvcrg", resourceIdentifier.resourceGroup);
            armExplorer.throwIfNotEqual("Microsoft.ClassicCompute/domainNames/slots/roles/metricDefinitions", resourceIdentifier.resourceType);
            armExplorer.throwIfNotEqual("x123cloudsvc/Production/WorkerRole1", resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceId);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResGrpNameResTypeResNameSubType1SubName1SubType2SubName2SubType3SubName3() {
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1/metricDefinitions/Percentage CPU";
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithGroupTypeName, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("cloudsvcrg", resourceIdentifier.resourceGroup);
            armExplorer.throwIfNotEqual("Microsoft.ClassicCompute/domainNames/slots/roles/metricDefinitions", resourceIdentifier.resourceType);
            armExplorer.throwIfNotEqual("x123cloudsvc/Production/WorkerRole1/Percentage CPU", resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceId);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResourceUrlWithList() {
            let value = {};
            value.httpMethod = "POST";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rgrp1/providers/Microsoft.Web/sites/WebApp120170517014339/config/appsettings/list";
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithGroupTypeName, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("rgrp1", resourceIdentifier.resourceGroup);
            armExplorer.throwIfNotEqual("Microsoft.Web/sites/config", resourceIdentifier.resourceType);
            armExplorer.throwIfNotEqual("WebApp120170517014339/appsettings", resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceId);
            armExplorer.logSuccess(arguments);
        }
    })(ARMUrlParserTests || (ARMUrlParserTests = {}));
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    class MockResourceHandlerResolver {
        constructor(resourceHandler) {
            this.resourceHandler = resourceHandler;
        }
        getResourceHandler(resType) {
            return this.resourceHandler;
        }
    }
    let CliScriptGeneratorTests;
    (function (CliScriptGeneratorTests) {
        scriptSubscriptions();
        scriptSubscription();
        scriptSubscriptionLocations();
        scriptResourceGroups();
        scriptResourceGroup();
        scriptWebApps();
        scriptWebApp();
        scriptGenericResource();
        function scriptSubscriptions() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions";
            value.resourceDefinition = resourceDefinition;
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resolver = new armExplorer.ScriptParametersResolver(parser);
            let resourceHandlerResolver = new MockResourceHandlerResolver(new armExplorer.Subscriptions(resolver));
            let scriptor = new armExplorer.CliScriptGenerator(resolver, resourceHandlerResolver);
            armExplorer.throwIfNotEqual(armExplorer.CliResourceType.Subscriptions, scriptor.getCliResourceType());
            const expected = "az account list\n\n";
            armExplorer.throwIfNotEqual(expected, scriptor.getScript());
            armExplorer.logSuccess(arguments);
        }
        function scriptSubscription() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000";
            value.resourceDefinition = resourceDefinition;
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resolver = new armExplorer.ScriptParametersResolver(parser);
            let resourceHandlerResolver = new MockResourceHandlerResolver(new armExplorer.Subscription(resolver));
            let scriptor = new armExplorer.CliScriptGenerator(resolver, resourceHandlerResolver);
            armExplorer.throwIfNotEqual(armExplorer.CliResourceType.Subscription, scriptor.getCliResourceType());
            const expected = "az account show --subscription 00000000-0000-0000-0000-000000000000\n\n";
            armExplorer.throwIfNotEqual(expected, scriptor.getScript());
            armExplorer.logSuccess(arguments);
        }
        function scriptResourceGroups() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups";
            value.resourceDefinition = resourceDefinition;
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resolver = new armExplorer.ScriptParametersResolver(parser);
            let resourceHandlerResolver = new MockResourceHandlerResolver(new armExplorer.ResourceGroups(resolver));
            let scriptor = new armExplorer.CliScriptGenerator(resolver, resourceHandlerResolver);
            armExplorer.throwIfNotEqual(armExplorer.CliResourceType.ResourceGroups, scriptor.getCliResourceType());
            const expectedScriptGet = "az group list\n\n";
            const expectedScriptNew = "az group create --location westus --name NewResourceGroupName\n\n";
            armExplorer.throwIfNotEqual(expectedScriptGet + expectedScriptNew, scriptor.getScript());
            armExplorer.logSuccess(arguments);
        }
        function scriptResourceGroup() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "PUT", "DELETE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = ["exportTemplate", "moveResources", "providers", "validateMoveResources"];
            let actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/6e6e25b…-43f4-bdde-1864842e524b/resourceGroups/cloudsvcrg", query: undefined, requestBody: undefined };
            actions[1] = { httpMethod: "POST", name: "exportTemplate", url: "https://management.azure.com/subscriptions/6e6e25b…842e524b/resourceGroups/cloudsvcrg/exportTemplate", query: undefined, requestBody: '{"options": "IncludeParameterDefaultValue, IncludeComments", "resources": ["* "]}' };
            actions[2] = { httpMethod: "POST", name: "moveResources", url: "https://management.azure.com/subscriptions/6e6e25b…842e524b/resourceGroups/cloudsvcrg/moveResources", query: undefined, requestBody: '{"targetResourceGroup": "(string)","resources": ["(string)"]}' };
            actions[3] = { httpMethod: "POST", name: "validateMoveResources", url: "https://management.azure.com/subscriptions/6e6e25b…842e524b/resourceGroups/cloudsvcrg/validateMoveResources", query: undefined, requestBody: '{"targetResourceGroup": "(string)","resources": ["(string)"]}' };
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg";
            value.resourceDefinition = resourceDefinition;
            let parser = new armExplorer.ARMUrlParser(value, actions);
            let resolver = new armExplorer.ScriptParametersResolver(parser);
            let resourceHandlerResolver = new MockResourceHandlerResolver(new armExplorer.ResourceGroup(resolver));
            let scriptor = new armExplorer.CliScriptGenerator(resolver, resourceHandlerResolver);
            armExplorer.throwIfNotEqual(armExplorer.CliResourceType.ResourceGroup, scriptor.getCliResourceType());
            const expectedScriptGet = 'az group show --name "cloudsvcrg"\n\n';
            const expectedScriptSet = 'az group update --name "cloudsvcrg" <properties>\n\n';
            const expectedScriptRemove = 'az group delete --name "cloudsvcrg"\n\n';
            armExplorer.throwIfNotEqual(expectedScriptGet + expectedScriptSet + expectedScriptRemove, scriptor.getScript());
            armExplorer.logSuccess(arguments);
        }
        function scriptWebApps() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2014-03-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/6e6e25b9-3ade-43f4-bdde-1864842e524b/resourceGroups/rgrp1/providers/Microsoft.Web/sites";
            value.resourceDefinition = resourceDefinition;
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resolver = new armExplorer.ScriptParametersResolver(parser);
            let resourceHandlerResolver = new MockResourceHandlerResolver(new armExplorer.WebApps(resolver));
            let scriptor = new armExplorer.CliScriptGenerator(resolver, resourceHandlerResolver);
            armExplorer.throwIfNotEqual(armExplorer.CliResourceType.WebApps, scriptor.getCliResourceType());
            const expectedScriptGet = 'az webapp list --resource-group "rgrp1"\n\n';
            const expectedScriptNew = 'az webapp create --resource-group "rgrp1" --plan planName --name NewWebAppName\n\n';
            armExplorer.throwIfNotEqual(expectedScriptGet + expectedScriptNew, scriptor.getScript());
            armExplorer.logSuccess(arguments);
        }
        function scriptWebApp() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "DELETE", "PUT", "CREATE"];
            resourceDefinition.apiVersion = "2016-03-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/6e6e25b9-3ade-43f4-bdde-1864842e524b/resourceGroups/rgrp1/providers/Microsoft.Web/sites/xdfxdfxdfxdf";
            value.resourceDefinition = resourceDefinition;
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resolver = new armExplorer.ScriptParametersResolver(parser);
            let resourceHandlerResolver = new MockResourceHandlerResolver(new armExplorer.WebApp(resolver));
            let scriptor = new armExplorer.CliScriptGenerator(resolver, resourceHandlerResolver);
            armExplorer.throwIfNotEqual(armExplorer.CliResourceType.WebApp, scriptor.getCliResourceType());
            const expectedScriptGet = 'az webapp show --name "xdfxdfxdfxdf" --resource-group "rgrp1"\n\n';
            const expectedScriptSet = 'az resource update --id /subscriptions/6e6e25b9-3ade-43f4-bdde-1864842e524b/resourceGroups/rgrp1/providers/Microsoft.Web/sites/xdfxdfxdfxdf --api-version 2016-03-01 --set properties.key=value\n\n';
            const expectedScriptNew = 'az webapp create --resource-group "rgrp1" --plan planName --name NewWebAppName\n\n';
            armExplorer.throwIfNotEqual(expectedScriptGet + expectedScriptSet + expectedScriptNew, scriptor.getScript());
            armExplorer.logSuccess(arguments);
        }
        function scriptGenericResource() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "PUT", "DELETE"];
            resourceDefinition.apiVersion = "2016-04-01";
            resourceDefinition.children = ["slots"];
            let actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc", query: undefined, requestBody: undefined };
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            let resourceHandlerResolver = new MockResourceHandlerResolver(new armExplorer.GenericResource(resolver));
            let scriptor = new armExplorer.CliScriptGenerator(resolver, resourceHandlerResolver);
            armExplorer.throwIfNotEqual(armExplorer.CliResourceType.GenericResource, scriptor.getCliResourceType());
            const expectedScriptGet = 'az resource show --id /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc --api-version 2016-04-01\n\n';
            const expectedScriptSet = 'az resource update --id /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc --api-version 2016-04-01 --set properties.key=value\n\n';
            const expectedScriptDelete = 'az resource delete --id /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc --api-version 2016-04-01\n\n';
            armExplorer.throwIfNotEqual(expectedScriptGet + expectedScriptSet + expectedScriptDelete, scriptor.getScript());
            armExplorer.logSuccess(arguments);
        }
        function scriptSubscriptionLocations() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET"];
            resourceDefinition.apiVersion = "2014-04-01";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/locations";
            value.resourceDefinition = resourceDefinition;
            let parser = new armExplorer.ARMUrlParser(value, []);
            let resolver = new armExplorer.ScriptParametersResolver(parser);
            let resourceHandlerResolver = new MockResourceHandlerResolver(new armExplorer.SubscriptionLocations(resolver));
            let scriptor = new armExplorer.CliScriptGenerator(resolver, resourceHandlerResolver);
            armExplorer.throwIfNotEqual(armExplorer.CliResourceType.SubscriptionLocations, scriptor.getCliResourceType());
            const expectedScript = "az account list-locations\n\n";
            armExplorer.throwIfNotEqual(expectedScript, scriptor.getScript());
            armExplorer.logSuccess(arguments);
        }
    })(CliScriptGeneratorTests || (CliScriptGeneratorTests = {}));
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    let PsScriptGeneratorTests;
    (function (PsScriptGeneratorTests) {
        scriptSubscriptions();
        scriptSubscriptionsSubId();
        scriptSubscriptionsSubIdResGroup();
        scriptResourceIDOnlyWithResourceGroupName();
        scriptResGrpNameResType();
        scriptResGrpNameResTypeResName();
        scriptResGrpNameResTypeResNameSubType1();
        scriptResGrpNameResTypeResNameSubType1SubName1();
        scriptResGrpNameResTypeResNameSubType1SubName1SubType2();
        scriptResGrpNameResTypeResNameSubType1SubName1SubType2SubName2();
        scriptResGrpNameResTypeResNameSubType1SubName1SubType2SubName2SubType3();
        scriptResGrpNameResTypeResNameSubType1SubName1SubType2SubName2SubType3SubName3();
        scriptResourceUrlWithList();
        function scriptSubscriptions() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            let scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedScripts = [];
            expectedScripts[0] = "# GET subscriptions\nGet-AzureRmResource -ResourceId /subscriptions -ApiVersion 2014-04-01\n\n";
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            let expectedScriptIndex = 0;
            for (let cmdActionPair of actualSupportedCommands) {
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptSubscriptionsSubId() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            let scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedScripts = [];
            expectedScripts[0] = "# GET 00000000-0000-0000-0000-000000000000\nGet-AzureRmResource -ResourceId /subscriptions/00000000-0000-0000-0000-000000000000 -ApiVersion 2014-04-01\n\n";
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            let expectedScriptIndex = 0;
            for (let cmdActionPair of actualSupportedCommands) {
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptSubscriptionsSubIdResGroup() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            let scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedScripts = [];
            expectedScripts[0] = "# GET resourceGroups\nGet-AzureRmResource -ResourceId /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups -ApiVersion 2014-04-01\n\n";
            expectedScripts[1] = '# CREATE resourceGroups\n$ResourceLocation = "West US"\n$ResourceName = "NewresourceGroup"\n\nNew-AzureRmResourceGroup -Location $ResourceLocation -Name $ResourceName\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            let expectedScriptIndex = 0;
            for (let cmdActionPair of actualSupportedCommands) {
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResourceIDOnlyWithResourceGroupName() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "PUT", "DELETE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = ["exportTemplate", "moveResources", "providers", "validateMoveResources"];
            let actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/6e6e25b…-43f4-bdde-1864842e524b/resourceGroups/cloudsvcrg", query: undefined, requestBody: undefined };
            actions[1] = { httpMethod: "POST", name: "exportTemplate", url: "https://management.azure.com/subscriptions/6e6e25b…842e524b/resourceGroups/cloudsvcrg/exportTemplate", query: undefined, requestBody: '{"options": "IncludeParameterDefaultValue, IncludeComments", "resources": ["* "]}' };
            actions[2] = { httpMethod: "POST", name: "moveResources", url: "https://management.azure.com/subscriptions/6e6e25b…842e524b/resourceGroups/cloudsvcrg/moveResources", query: undefined, requestBody: '{"targetResourceGroup": "(string)","resources": ["(string)"]}' };
            actions[3] = { httpMethod: "POST", name: "validateMoveResources", url: "https://management.azure.com/subscriptions/6e6e25b…842e524b/resourceGroups/cloudsvcrg/validateMoveResources", query: undefined, requestBody: '{"targetResourceGroup": "(string)","resources": ["(string)"]}' };
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            let scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedScripts = [];
            expectedScripts[0] = "# GET cloudsvcrg\nGet-AzureRmResource -ResourceId /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg -ApiVersion 2014-04-01\n\n";
            expectedScripts[1] = '# SET cloudsvcrg\n$PropertiesObject = @{\n\t#Property = value;\n}\nSet-AzureRmResource -PropertyObject $PropertiesObject -ResourceId /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg -ApiVersion 2014-04-01 -Force\n\n';
            expectedScripts[2] = '# DELETE cloudsvcrg\nRemove-AzureRmResource -ResourceId /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg -ApiVersion 2014-04-01 -Force\n\n';
            expectedScripts[3] = '# Action exportTemplate\n$ParametersObject = @{\n\toptions = "IncludeParameterDefaultValue, IncludeComments"\n\tresources = (\n\t\t"* "\n\t)\n}\n\nInvoke-AzureRmResourceAction -ResourceId /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg -Action exportTemplate -Parameters $ParametersObject -ApiVersion 2014-04-01 -Force\n\n';
            expectedScripts[4] = '# Action moveResources\n$ParametersObject = @{\n\ttargetResourceGroup = "(string)"\n\tresources = (\n\t\t"(string)"\n\t)\n}\n\nInvoke-AzureRmResourceAction -ResourceId /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg -Action moveResources -Parameters $ParametersObject -ApiVersion 2014-04-01 -Force\n\n';
            expectedScripts[5] = '# Action validateMoveResources\n$ParametersObject = @{\n\ttargetResourceGroup = "(string)"\n\tresources = (\n\t\t"(string)"\n\t)\n}\n\nInvoke-AzureRmResourceAction -ResourceId /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg -Action validateMoveResources -Parameters $ParametersObject -ApiVersion 2014-04-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            let expectedScriptIndex = 0;
            for (let cmdActionPair of actualSupportedCommands) {
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResGrpNameResType() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2016-04-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            let scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedScripts = [];
            expectedScripts[0] = "# GET domainNames\nGet-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames -IsCollection -ApiVersion 2016-04-01\n\n";
            expectedScripts[1] = '# CREATE domainNames\n$ResourceLocation = "West US"\n$ResourceName = "NewdomainName"\n$PropertiesObject = @{\n\t#Property = value;\n}\nNew-AzureRmResource -ResourceName $ResourceName -Location $ResourceLocation -PropertyObject $PropertiesObject -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames -ApiVersion 2016-04-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            let expectedScriptIndex = 0;
            for (let cmdActionPair of actualSupportedCommands) {
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResGrpNameResTypeResName() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "PUT", "DELETE"];
            resourceDefinition.apiVersion = "2016-04-01";
            resourceDefinition.children = ["slots"];
            let actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc", query: undefined, requestBody: undefined };
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            let scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedScripts = [];
            expectedScripts[0] = '# GET x123cloudsvc\nGet-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames -ResourceName "x123cloudsvc" -ApiVersion 2016-04-01\n\n';
            expectedScripts[1] = '# SET x123cloudsvc\n$PropertiesObject = @{\n\t#Property = value;\n}\nSet-AzureRmResource -PropertyObject $PropertiesObject -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames -ResourceName "x123cloudsvc" -ApiVersion 2016-04-01 -Force\n\n';
            expectedScripts[2] = '# DELETE x123cloudsvc\nRemove-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames -ResourceName "x123cloudsvc" -ApiVersion 2016-04-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            let expectedScriptIndex = 0;
            for (let cmdActionPair of actualSupportedCommands) {
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResGrpNameResTypeResNameSubType1() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2016-04-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            let scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedScripts = [];
            expectedScripts[0] = '# GET slots\nGet-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots -ResourceName "x123cloudsvc" -ApiVersion 2016-04-01\n\n';
            expectedScripts[1] = '# CREATE slots\n$ResourceLocation = "West US"\n$ResourceName = "Newslot"\n$PropertiesObject = @{\n\t#Property = value;\n}\nNew-AzureRmResource -Location $ResourceLocation -PropertyObject $PropertiesObject -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots -ResourceName "x123cloudsvc/$ResourceName" -ApiVersion 2016-04-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            let expectedScriptIndex = 0;
            for (let cmdActionPair of actualSupportedCommands) {
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResGrpNameResTypeResNameSubType1SubName1() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "DELETE", "PUT"];
            resourceDefinition.apiVersion = "2016-04-01";
            resourceDefinition.children = ["roles"];
            let actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production", query: undefined, requestBody: undefined };
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            let scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedScripts = [];
            expectedScripts[0] = '# GET Production\nGet-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots -ResourceName "x123cloudsvc/Production" -ApiVersion 2016-04-01\n\n';
            expectedScripts[1] = '# SET Production\n$PropertiesObject = @{\n\t#Property = value;\n}\nSet-AzureRmResource -PropertyObject $PropertiesObject -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots -ResourceName "x123cloudsvc/Production" -ApiVersion 2016-04-01 -Force\n\n';
            expectedScripts[2] = '# DELETE Production\nRemove-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots -ResourceName "x123cloudsvc/Production" -ApiVersion 2016-04-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            let expectedScriptIndex = 0;
            for (let cmdActionPair of actualSupportedCommands) {
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResGrpNameResTypeResNameSubType1SubName1SubType2() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2016-04-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            let scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedScripts = [];
            expectedScripts[0] = '# GET roles\nGet-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles -ResourceName "x123cloudsvc/Production" -ApiVersion 2016-04-01\n\n';
            expectedScripts[1] = '# CREATE roles\n$ResourceLocation = "West US"\n$ResourceName = "Newrole"\n$PropertiesObject = @{\n\t#Property = value;\n}\nNew-AzureRmResource -Location $ResourceLocation -PropertyObject $PropertiesObject -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles -ResourceName "x123cloudsvc/Production/$ResourceName" -ApiVersion 2016-04-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            let expectedScriptIndex = 0;
            for (let cmdActionPair of actualSupportedCommands) {
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResGrpNameResTypeResNameSubType1SubName1SubType2SubName2() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "DELETE", "PUT"];
            resourceDefinition.apiVersion = "2016-04-01";
            resourceDefinition.children = ["metricDefinitions", "metrics"];
            let actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1", query: undefined, requestBody: undefined };
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            let scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedScripts = [];
            expectedScripts[0] = '# GET WorkerRole1\nGet-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles -ResourceName "x123cloudsvc/Production/WorkerRole1" -ApiVersion 2016-04-01\n\n';
            expectedScripts[1] = '# SET WorkerRole1\n$PropertiesObject = @{\n\t#Property = value;\n}\nSet-AzureRmResource -PropertyObject $PropertiesObject -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles -ResourceName "x123cloudsvc/Production/WorkerRole1" -ApiVersion 2016-04-01 -Force\n\n';
            expectedScripts[2] = '# DELETE WorkerRole1\nRemove-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles -ResourceName "x123cloudsvc/Production/WorkerRole1" -ApiVersion 2016-04-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            let expectedScriptIndex = 0;
            for (let cmdActionPair of actualSupportedCommands) {
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResGrpNameResTypeResNameSubType1SubName1SubType2SubName2SubType3() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1/metricDefinitions";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            let scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedScripts = [];
            expectedScripts[0] = '# GET metricDefinitions\nGet-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles/metricDefinitions -ResourceName "x123cloudsvc/Production/WorkerRole1" -ApiVersion 2014-04-01\n\n';
            expectedScripts[1] = '# CREATE metricDefinitions\n$ResourceLocation = "West US"\n$ResourceName = "NewmetricDefinition"\n$PropertiesObject = @{\n\t#Property = value;\n}\nNew-AzureRmResource -Location $ResourceLocation -PropertyObject $PropertiesObject -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles/metricDefinitions -ResourceName "x123cloudsvc/Production/WorkerRole1/$ResourceName" -ApiVersion 2014-04-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            let expectedScriptIndex = 0;
            for (let cmdActionPair of actualSupportedCommands) {
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResGrpNameResTypeResNameSubType1SubName1SubType2SubName2SubType3SubName3() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["PUT", "GET", "DELETE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            let actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1/metricDefinitions/Percentage CPU", query: undefined, requestBody: undefined };
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1/metricDefinitions/Percentage CPU";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            let scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedScripts = [];
            expectedScripts[0] = '# GET Percentage CPU\nGet-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles/metricDefinitions -ResourceName "x123cloudsvc/Production/WorkerRole1/Percentage CPU" -ApiVersion 2014-04-01\n\n';
            expectedScripts[1] = '# SET Percentage CPU\n$PropertiesObject = @{\n\t#Property = value;\n}\nSet-AzureRmResource -PropertyObject $PropertiesObject -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles/metricDefinitions -ResourceName "x123cloudsvc/Production/WorkerRole1/Percentage CPU" -ApiVersion 2014-04-01 -Force\n\n';
            expectedScripts[2] = '# DELETE Percentage CPU\nRemove-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles/metricDefinitions -ResourceName "x123cloudsvc/Production/WorkerRole1/Percentage CPU" -ApiVersion 2014-04-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            let expectedScriptIndex = 0;
            for (let cmdActionPair of actualSupportedCommands) {
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResourceUrlWithList() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["PUT", "GETPOST"];
            resourceDefinition.apiVersion = "2016-03-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "POST";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rgrp1/providers/Microsoft.Web/sites/WebApp120170517014339/config/appsettings/list";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            let scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedScripts = [];
            expectedScripts[0] = '# LIST appsettings\n$resource = Invoke-AzureRmResourceAction -ResourceGroupName rgrp1 -ResourceType Microsoft.Web/sites/config -ResourceName "WebApp120170517014339/appsettings" -Action list -ApiVersion 2016-03-01 -Force\n$resource.Properties\n\n';
            expectedScripts[1] = '# SET list\n$PropertiesObject = @{\n\t#Property = value;\n}\nNew-AzureRmResource -PropertyObject $PropertiesObject -ResourceGroupName rgrp1 -ResourceType Microsoft.Web/sites/config -ResourceName "WebApp120170517014339/appsettings" -ApiVersion 2016-03-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            let expectedScriptIndex = 0;
            for (let cmdActionPair of actualSupportedCommands) {
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
    })(PsScriptGeneratorTests || (PsScriptGeneratorTests = {}));
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    let ScriptParameterResolverTests;
    (function (ScriptParameterResolverTests) {
        getParametersForSubscriptions();
        getParametersForSubscriptionsSubId();
        getParametersForSubscriptionsSubIdResGroup();
        getParametersForResourceIDOnlyWithResourceGroupName();
        getParametersForResGrpNameResType();
        getParametersForResGrpNameResTypeResName();
        getParametersForResGrpNameResTypeResNameSubType1();
        getParametersForResGrpNameResTypeResNameSubType1SubName1();
        getParametersForResGrpNameResTypeResNameSubType1SubName1SubType2();
        getParametersForResGrpNameResTypeResNameSubType1SubName1SubType2SubName2();
        getParametersForResGrpNameResTypeResNameSubType1SubName1SubType2SubName2SubType3();
        getParametersForResGrpNameResTypeResNameSubType1SubName1SubType2SubName2SubType3SubName3();
        getParametersForResourceUrlWithList();
        function getParametersForSubscriptions() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            let expectedcCmdletParameters = [];
            let cmdletParameters = {};
            let cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithIDOnly;
            cmdletResourceInfo.resourceId = "/subscriptions";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2014-04-01";
            cmdletParameters.isCollection = false;
            expectedcCmdletParameters.push(cmdletParameters);
            let cmdIndex = 0;
            for (let actualCmdType of actualSupportedCommands) {
                armExplorer.throwIfObjectNotEqual(expectedcCmdletParameters[cmdIndex], resolver.getParameters());
            }
            armExplorer.logSuccess(arguments);
        }
        function getParametersForSubscriptionsSubId() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            let expectedCmdletParameters = [];
            let cmdletParameters = {};
            let cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithIDOnly;
            cmdletResourceInfo.resourceId = "/subscriptions/00000000-0000-0000-0000-000000000000";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2014-04-01";
            cmdletParameters.isCollection = false;
            expectedCmdletParameters.push(cmdletParameters);
            let cmdIndex = 0;
            for (let actualCmdType of actualSupportedCommands) {
                armExplorer.throwIfObjectNotEqual(expectedCmdletParameters[cmdIndex], resolver.getParameters());
            }
            armExplorer.logSuccess(arguments);
        }
        function getParametersForSubscriptionsSubIdResGroup() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }, { cmd: "New-AzureRmResourceGroup", isAction: false, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            let cmdletParameters = {};
            let cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithIDOnly;
            cmdletResourceInfo.resourceId = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2014-04-01";
            cmdletParameters.isCollection = false;
            armExplorer.throwIfObjectNotEqual(cmdletParameters, resolver.getParameters());
            armExplorer.logSuccess(arguments);
        }
        function getParametersForResourceIDOnlyWithResourceGroupName() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "PUT", "DELETE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = ["exportTemplate", "moveResources", "providers", "validateMoveResources"];
            let actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/6e6e25b…-43f4-bdde-1864842e524b/resourceGroups/cloudsvcrg", query: undefined, requestBody: undefined };
            actions[1] = { httpMethod: "POST", name: "exportTemplate", url: "https://management.azure.com/subscriptions/6e6e25b…842e524b/resourceGroups/cloudsvcrg/exportTemplate", query: undefined, requestBody: "{'options': 'IncludeParameterDefaultValue, IncludeComments', 'resources': ['* ']}" };
            actions[2] = { httpMethod: "POST", name: "moveResources", url: "https://management.azure.com/subscriptions/6e6e25b…842e524b/resourceGroups/cloudsvcrg/moveResources", query: undefined, requestBody: "{'targetResourceGroup': '(string)','resources': ['(string)']}" };
            actions[3] = { httpMethod: "POST", name: "validateMoveResources", url: "https://management.azure.com/subscriptions/6e6e25b…842e524b/resourceGroups/cloudsvcrg/validateMoveResources", query: undefined, requestBody: "{'targetResourceGroup': '(string)','resources': ['(string)']}" };
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedSupportedCommands = [
                { cmd: "Get-AzureRmResource", isAction: false, isSetAction: false },
                { cmd: "Set-AzureRmResource", isAction: false, isSetAction: true },
                { cmd: "Remove-AzureRmResource", isAction: true, isSetAction: false },
                { cmd: "Invoke-AzureRmResourceAction", isAction: true, isSetAction: false },
                { cmd: "Invoke-AzureRmResourceAction", isAction: true, isSetAction: false },
                { cmd: "Invoke-AzureRmResourceAction", isAction: true, isSetAction: false }
            ];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            let cmdletParameters = {};
            let cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithIDOnly;
            cmdletResourceInfo.resourceId = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2014-04-01";
            cmdletParameters.isCollection = false;
            armExplorer.throwIfObjectNotEqual(cmdletParameters, resolver.getParameters());
            armExplorer.logSuccess(arguments);
        }
        function getParametersForResGrpNameResType() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2016-04-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }, { cmd: "New-AzureRmResource", isAction: false, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            let cmdletParameters = {};
            let cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithGroupType;
            cmdletResourceInfo.resourceGroup = "cloudsvcrg";
            cmdletResourceInfo.resourceType = "Microsoft.ClassicCompute/domainNames";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2016-04-01";
            cmdletParameters.isCollection = true;
            armExplorer.throwIfObjectNotEqual(cmdletParameters, resolver.getParameters());
            armExplorer.logSuccess(arguments);
        }
        function getParametersForResGrpNameResTypeResName() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "PUT", "DELETE"];
            resourceDefinition.apiVersion = "2016-04-01";
            resourceDefinition.children = ["slots"];
            let actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc", query: undefined, requestBody: undefined };
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }, { cmd: "Set-AzureRmResource", isAction: false, isSetAction: true },
                { cmd: "Remove-AzureRmResource", isAction: true, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            let cmdletParameters = {};
            let cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithGroupTypeName;
            cmdletResourceInfo.resourceGroup = "cloudsvcrg";
            cmdletResourceInfo.resourceName = "x123cloudsvc";
            cmdletResourceInfo.resourceType = "Microsoft.ClassicCompute/domainNames";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2016-04-01";
            cmdletParameters.isCollection = false;
            armExplorer.throwIfObjectNotEqual(cmdletParameters, resolver.getParameters());
            armExplorer.logSuccess(arguments);
        }
        function getParametersForResGrpNameResTypeResNameSubType1() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }, { cmd: "New-AzureRmResource", isAction: false, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            let cmdletParameters = {};
            let cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithGroupTypeName;
            cmdletResourceInfo.resourceGroup = "cloudsvcrg";
            cmdletResourceInfo.resourceName = "x123cloudsvc";
            cmdletResourceInfo.resourceType = "Microsoft.ClassicCompute/domainNames/slots";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2014-04-01";
            cmdletParameters.isCollection = false;
            armExplorer.throwIfObjectNotEqual(cmdletParameters, resolver.getParameters());
            armExplorer.logSuccess(arguments);
        }
        function getParametersForResGrpNameResTypeResNameSubType1SubName1() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "DELETE", "PUT"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = ["roles"];
            let actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production", query: undefined, requestBody: undefined };
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }, { cmd: "Set-AzureRmResource", isAction: false, isSetAction: true },
                { cmd: "Remove-AzureRmResource", isAction: true, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            let cmdletParameters = {};
            let cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithGroupTypeName;
            cmdletResourceInfo.resourceGroup = "cloudsvcrg";
            cmdletResourceInfo.resourceName = "x123cloudsvc/Production";
            cmdletResourceInfo.resourceType = "Microsoft.ClassicCompute/domainNames/slots";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2014-04-01";
            cmdletParameters.isCollection = false;
            armExplorer.throwIfObjectNotEqual(cmdletParameters, resolver.getParameters());
            armExplorer.logSuccess(arguments);
        }
        function getParametersForResGrpNameResTypeResNameSubType1SubName1SubType2() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }, { cmd: "New-AzureRmResource", isAction: false, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            let cmdletParameters = {};
            let cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithGroupTypeName;
            cmdletResourceInfo.resourceGroup = "cloudsvcrg";
            cmdletResourceInfo.resourceName = "x123cloudsvc/Production";
            cmdletResourceInfo.resourceType = "Microsoft.ClassicCompute/domainNames/slots/roles";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2014-04-01";
            cmdletParameters.isCollection = false;
            armExplorer.throwIfObjectNotEqual(cmdletParameters, resolver.getParameters());
            armExplorer.logSuccess(arguments);
        }
        function getParametersForResGrpNameResTypeResNameSubType1SubName1SubType2SubName2() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "DELETE", "PUT"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = ["metricDefinitions", "metrics"];
            let actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1", query: undefined, requestBody: undefined };
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }, { cmd: "Set-AzureRmResource", isAction: false, isSetAction: true },
                { cmd: "Remove-AzureRmResource", isAction: true, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            let cmdletParameters = {};
            let cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithGroupTypeName;
            cmdletResourceInfo.resourceGroup = "cloudsvcrg";
            cmdletResourceInfo.resourceName = "x123cloudsvc/Production/WorkerRole1";
            cmdletResourceInfo.resourceType = "Microsoft.ClassicCompute/domainNames/slots/roles";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2014-04-01";
            cmdletParameters.isCollection = false;
            armExplorer.throwIfObjectNotEqual(cmdletParameters, resolver.getParameters());
            armExplorer.logSuccess(arguments);
        }
        function getParametersForResGrpNameResTypeResNameSubType1SubName1SubType2SubName2SubType3() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1/metricDefinitions";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }, { cmd: "New-AzureRmResource", isAction: false, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            let cmdletParameters = {};
            let cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithGroupTypeName;
            cmdletResourceInfo.resourceGroup = "cloudsvcrg";
            cmdletResourceInfo.resourceName = "x123cloudsvc/Production/WorkerRole1";
            cmdletResourceInfo.resourceType = "Microsoft.ClassicCompute/domainNames/slots/roles/metricDefinitions";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2014-04-01";
            cmdletParameters.isCollection = false;
            armExplorer.throwIfObjectNotEqual(cmdletParameters, resolver.getParameters());
            armExplorer.logSuccess(arguments);
        }
        function getParametersForResGrpNameResTypeResNameSubType1SubName1SubType2SubName2SubType3SubName3() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["PUT", "GET", "DELETE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            let actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1/metricDefinitions/Percentage CPU", query: undefined, requestBody: undefined };
            let value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1/metricDefinitions/Percentage CPU";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }, { cmd: "Set-AzureRmResource", isAction: false, isSetAction: true },
                { cmd: "Remove-AzureRmResource", isAction: true, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            let cmdletParameters = {};
            let cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithGroupTypeName;
            cmdletResourceInfo.resourceGroup = "cloudsvcrg";
            cmdletResourceInfo.resourceName = "x123cloudsvc/Production/WorkerRole1/Percentage CPU";
            cmdletResourceInfo.resourceType = "Microsoft.ClassicCompute/domainNames/slots/roles/metricDefinitions";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2014-04-01";
            cmdletParameters.isCollection = false;
            armExplorer.throwIfObjectNotEqual(cmdletParameters, resolver.getParameters());
            armExplorer.logSuccess(arguments);
        }
        function getParametersForResourceUrlWithList() {
            let resourceDefinition = {};
            resourceDefinition.actions = ["PUT", "GETPOST"];
            resourceDefinition.apiVersion = "2016-03-01";
            let value = {};
            value.httpMethod = "POST";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rgrp1/providers/Microsoft.Web/sites/WebApp120170517014339/config/appsettings/list";
            value.resourceDefinition = resourceDefinition;
            let resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            let scriptor = new armExplorer.PowerShellScriptGenerator(resolver);
            let actualSupportedCommands = resolver.getSupportedCommands();
            let expectedSupportedCommands = [{ cmd: "Invoke-AzureRmResourceAction", isAction: false, isSetAction: false }, { cmd: "New-AzureRmResource", isAction: false, isSetAction: true }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            let cmdletParameters = {};
            let cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithGroupTypeName;
            cmdletResourceInfo.resourceGroup = "rgrp1";
            cmdletResourceInfo.resourceName = "WebApp120170517014339/appsettings";
            cmdletResourceInfo.resourceType = "Microsoft.Web/sites/config";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2016-03-01";
            cmdletParameters.isCollection = false;
            armExplorer.throwIfObjectNotEqual(cmdletParameters, resolver.getParameters());
            armExplorer.logSuccess(arguments);
        }
    })(ScriptParameterResolverTests || (ScriptParameterResolverTests = {}));
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    function keyCount(arg) {
        let count = 0;
        for (let key in arg) {
            if (arg.hasOwnProperty(key)) {
                count++;
            }
        }
        return count;
    }
    armExplorer.keyCount = keyCount;
    function throwIfObjectNotEqual(expected, actual) {
        throwIfNotEqual(keyCount(expected), keyCount(actual));
        for (let key in expected) {
            if (expected.hasOwnProperty(key)) {
                if (typeof expected[key] === 'object') {
                    throwIfObjectNotEqual(expected[key], actual[key]);
                }
                else {
                    throwIfNotEqual(expected[key], actual[key]);
                }
            }
        }
    }
    armExplorer.throwIfObjectNotEqual = throwIfObjectNotEqual;
    function throwIfArrayNotEqual(expectedStrings, actualStrings) {
        if (expectedStrings.length != actualStrings.length) {
            throw new Error("Expected: " + expectedStrings.length + "\nActual: " + actualStrings.length + "\n");
        }
        for (let i in expectedStrings) {
            if (expectedStrings.hasOwnProperty(i)) {
                throwIfNotEqual(expectedStrings[i], actualStrings[i]);
            }
        }
    }
    armExplorer.throwIfArrayNotEqual = throwIfArrayNotEqual;
    function throwIfNotEqual(expected, actual) {
        if (typeof expected === 'object') {
            throwIfObjectNotEqual(expected, actual);
        }
        else {
            if (expected !== actual) {
                throw new Error("Expected: " + expected + "\nActual: " + actual + "\n");
            }
        }
    }
    armExplorer.throwIfNotEqual = throwIfNotEqual;
    function throwIfDefined(arg) {
        if (typeof arg === 'undefined')
            return;
        throw new Error("Expected: undefined Actual: " + arg);
    }
    armExplorer.throwIfDefined = throwIfDefined;
    function logSuccess(callerArg) {
        let currentFunction = callerArg.callee.toString();
        console.log(currentFunction.substr(0, currentFunction.indexOf('(')).replace("function", "TEST") + " :PASSED");
    }
    armExplorer.logSuccess = logSuccess;
})(armExplorer || (armExplorer = {}));
//# sourceMappingURL=manageWithTests.js.map