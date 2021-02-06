var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var armExplorer;
(function (armExplorer) {
    var _this = this;
    angular.module("armExplorer", ["ngRoute", "ngAnimate", "ngSanitize", "ui.bootstrap", "angularBootstrapNavTree", "rx", "mp.resizer", "ui.ace"])
        .controller("treeBodyController", ["$scope", "$routeParams", "$location", "$http", "$timeout", "rx", "$document", function ($scope, $routeParams, $location, $http, $timeout, rx, $document) {
            $scope.treeControl = {};
            $scope.createModel = {};
            $scope.actionsModel = {};
            $scope.resources = [];
            $scope.readOnlyMode = true;
            $scope.editMode = false;
            $scope.treeBranchDataOverrides = ClientConfig.treeBranchDataOverrides;
            $scope.aceConfig = ClientConfig.aceConfig;
            var activeTab = [false, false, false, false, false];
            $timeout(function () {
                $scope.editorCollection = new EditorCollection();
                $scope.editorCollection.configureEditors();
            });
            $document.on('mouseup', function () { $timeout(function () { $scope.editorCollection.apply(function (e) { e.resize(); }); }); });
            $scope.$createObservableFunction("selectResourceHandler")
                .flatMapLatest(function (args) {
                var branch = args[0];
                var event = args[1];
                $scope.loading = true;
                delete $scope.errorResponse;
                if (branch.is_instruction) {
                    var parent = $scope.treeControl.get_parent_branch(branch);
                    $scope.treeControl.collapse_branch(parent);
                    $timeout(function () {
                        $scope.expandResourceHandler(parent, undefined, undefined, undefined, true /*dontFilterEmpty*/);
                        $scope.treeControl.select_branch(parent);
                    });
                }
                var resourceDefinition = branch.resourceDefinition;
                if (resourceDefinition) {
                    var getHttpConfig_1 = branch.getGetHttpConfig();
                    if (getHttpConfig_1) {
                        return rx.Observable.fromPromise($http(getHttpConfig_1))
                            //http://stackoverflow.com/a/30878646/3234163
                            .map(function (data) { return { resourceDefinition: resourceDefinition, data: data.data, url: getHttpConfig_1.data.Url, branch: branch, httpMethod: getHttpConfig_1.data.HttpMethod }; })["catch"](function (error) { return rx.Observable.of({ error: error }); });
                    }
                    else {
                        return rx.Observable.of({ branch: branch, resourceDefinition: resourceDefinition });
                    }
                }
                else {
                    return rx.Observable.fromPromise(Promise.resolve({ branch: branch }));
                }
            })
                .subscribe(function (value) {
                if (value.error) {
                    var error = value.error;
                    setStateForErrorOnResourceClick();
                    var apiVersion = "";
                    var url_1 = "";
                    if (error.config && error.config.resourceDefinition) {
                        url_1 = error.config.filledInUrl;
                        $scope.editorCollection.setValue(Editor.ResponseEditor, "");
                        $scope.readOnlyResponse = "";
                        apiVersion = error.config.resourceDefinition.apiVersion;
                    }
                    $scope.errorResponse = StringUtils.syntaxHighlight({ data: error.data, status: error.status });
                    $scope.selectedResource = {
                        url: url_1,
                        actionsAndVerbs: [],
                        httpMethods: ["GET"],
                        doc: [],
                        apiVersion: apiVersion,
                        putUrl: url_1
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
                            var editable = resourceDefinition.getEditable(value.data);
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
                        var actionsAndVerbs = $scope.resourceDefinitionsCollection.getActionsAndVerbs(value.branch);
                        var doc = resourceDefinition.getDocBody();
                        var docArray = DocumentationGenerator.getDocumentationFlatArray(value.data, doc);
                        $scope.selectedResource = {
                            // Some resources may contain # or whitespace in name,
                            // let's selectively URL-encode (for safety)
                            url: StringUtils.selectiveUrlencode(url),
                            actionsAndVerbs: actionsAndVerbs,
                            httpMethods: resourceDefinition.actions.filter(function (e) { return e !== "DELETE" && e !== "CREATE"; }).map(function (e) { return (e === "GETPOST" ? "POST" : e); }).sort(),
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
                var activeIndex = activeTab.indexOf(true);
                if ((!$scope.creatable && activeIndex === Editor.CreateEditor) ||
                    (!($scope.selectedResource && $scope.selectedResource.actionsAndVerbs &&
                        $scope.selectedResource.actionsAndVerbs.length > 0) && activeIndex === Editor.RequestEditor)) {
                    $timeout(function () { activeTab[Editor.ResponseEditor] = true; });
                }
            }
            $scope.handleClick = function (selectedResource, method, event) {
                if (method === "PUT" || method === "PATCH") {
                    var action = new Action(method, "", "");
                    invokePutOrPatch(selectedResource, action, event);
                }
                else {
                    refreshContent();
                }
            };
            $scope.invokeAction = function (selectedResource, action, event) {
                doInvokeAction(selectedResource, action, event);
            };
            function invokePutFinallyCallback() {
                $timeout(function () { $scope.invoking = false; $scope.loading = false; });
            }
            function invokePutErrorCallback(response) {
                $timeout(function () { $scope.putError = response.data ? StringUtils.syntaxHighlight(response.data) : StringUtils.syntaxHighlight(response.message); });
                ExplorerScreen.fadeInAndFadeOutError();
            }
            function finalizePut() {
                $timeout(function () {
                    $scope.selectResourceHandler($scope.treeControl.get_selected_branch(), undefined);
                    ExplorerScreen.fadeInAndFadeOutSuccess();
                });
            }
            function invokePutOrPatch(selectedResource, action, event) {
                return __awaiter(this, void 0, void 0, function () {
                    var repository, error_1;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                setStateForInvokePut();
                                if (!$scope.readOnlyMode) return [3 /*break*/, 1];
                                if (!action.isGetAction()) {
                                    ExplorerScreen.showReadOnlyConfirmation(event);
                                }
                                return [3 /*break*/, 6];
                            case 1:
                                repository = new ArmClientRepository($http);
                                _a.label = 2;
                            case 2:
                                _a.trys.push([2, 4, 5, 6]);
                                return [4 /*yield*/, repository.invokePut(selectedResource, action, $scope.editorCollection)];
                            case 3:
                                _a.sent();
                                finalizePut();
                                return [3 /*break*/, 6];
                            case 4:
                                error_1 = _a.sent();
                                invokePutErrorCallback(error_1);
                                return [3 /*break*/, 6];
                            case 5:
                                invokePutFinallyCallback();
                                return [7 /*endfinally*/];
                            case 6: return [2 /*return*/, Promise.resolve().then(invokePutFinallyCallback)];
                        }
                    });
                });
            }
            ;
            function keepChildPredicate(childName, resourceDefinition, dontFilterEmpty, branch, providersFilter) {
                var childDefinition = $scope.resourceDefinitionsCollection.getResourceDefinitionByNameAndUrl(childName, resourceDefinition.url + "/" + childName);
                var keepChild = false;
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
                return __awaiter(this, void 0, void 0, function () {
                    var providers, subscriptionBranch, repository, subscriptionsResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                providers = undefined;
                                subscriptionBranch = getSubscriptionBranch(branch);
                                if (!subscriptionBranch) return [3 /*break*/, 2];
                                repository = new ArmClientRepository($http);
                                return [4 /*yield*/, repository.getProvidersForSubscription(subscriptionBranch.value)];
                            case 1:
                                subscriptionsResponse = _a.sent();
                                providers = subscriptionsResponse.data;
                                _a.label = 2;
                            case 2: return [2 /*return*/, providers];
                        }
                    });
                });
            }
            $scope.expandResourceHandler = function (branch, row, event, dontExpandChildren, dontFilterEmpty) { return __awaiter(_this, void 0, void 0, function () {
                var resourceDefinition, children, originalTreeIcon, providersFilter_1, filteredChildren, isListFiltered, offset, parent, showAllTreeBranch, error_2, getUrl, originalIcon, httpConfig, repository, httpResponse, data, childDefinition, treeBranchProjection, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (branch.is_leaf)
                                return [2 /*return*/, Promise.resolve()];
                            if (branch.expanded) {
                                // clear the children array on collapse
                                branch.children.length = 0;
                                $timeout(function () { $scope.treeControl.collapse_branch(branch); });
                                return [2 /*return*/, Promise.resolve()];
                            }
                            resourceDefinition = branch.resourceDefinition;
                            if (!resourceDefinition)
                                return [2 /*return*/, Promise.resolve()];
                            children = resourceDefinition.children;
                            if (!(typeof children !== "string" && Array.isArray(children))) return [3 /*break*/, 5];
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            originalTreeIcon = showExpandingTreeItemIcon(row, branch);
                            return [4 /*yield*/, getProvidersForBranch(branch)];
                        case 2:
                            providersFilter_1 = _a.sent();
                            filteredChildren = children.filter(function (child) {
                                return keepChildPredicate(child, resourceDefinition, dontFilterEmpty, branch, providersFilter_1);
                            });
                            isListFiltered = filteredChildren.length !== children.length;
                            branch.children = filteredChildren.map(function (childName) {
                                var childDefinition = $scope.resourceDefinitionsCollection.getResourceDefinitionByNameAndUrl(childName, resourceDefinition.url + "/" + childName);
                                var newTreeBranch = new TreeBranch(childName);
                                newTreeBranch.resourceDefinition = childDefinition;
                                newTreeBranch.is_leaf = (childDefinition.children ? false : true);
                                newTreeBranch.elementUrl = branch.elementUrl + "/" + childName;
                                newTreeBranch.sortValue = childName;
                                newTreeBranch.iconNameOverride = null;
                                return newTreeBranch;
                            });
                            endExpandingTreeItem(branch, originalTreeIcon);
                            offset = 0;
                            if (!dontFilterEmpty && isListFiltered) {
                                parent = $scope.treeControl.get_parent_branch(branch);
                                if (branch.label === "providers" || (parent && parent.currentResourceGroupProviders)) {
                                    showAllTreeBranch = new TreeBranch("Show all");
                                    showAllTreeBranch.is_instruction = true;
                                    showAllTreeBranch.resourceDefinition = resourceDefinition;
                                    showAllTreeBranch.sortValue = null;
                                    showAllTreeBranch.iconNameOverride = null;
                                    branch.children.unshift(showAllTreeBranch);
                                    offset++;
                                }
                            }
                            $timeout(function () { $scope.treeControl.expand_branch(branch); });
                            if ((branch.children.length - offset) === 1 && !dontExpandChildren) {
                                $timeout(function () { $scope.expandResourceHandler($scope.treeControl.get_first_non_instruction_child(branch)); });
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            error_2 = _a.sent();
                            console.log(error_2);
                            return [3 /*break*/, 4];
                        case 4: return [3 /*break*/, 10];
                        case 5:
                            if (!(typeof children === "string")) return [3 /*break*/, 10];
                            getUrl = branch.elementUrl;
                            originalIcon = showExpandingTreeItemIcon(row, branch);
                            httpConfig = (getUrl.endsWith("resourceGroups") || getUrl.endsWith("subscriptions") || getUrl.split("/").length === 3)
                                ? {
                                    method: "GET",
                                    url: "api" + getUrl.substring(getUrl.indexOf("/subscriptions"))
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
                            _a.label = 6;
                        case 6:
                            _a.trys.push([6, 8, 9, 10]);
                            repository = new ArmClientRepository($http);
                            return [4 /*yield*/, repository.invokeHttp(httpConfig)];
                        case 7:
                            httpResponse = _a.sent();
                            data = httpResponse.data;
                            childDefinition = $scope.resourceDefinitionsCollection.getResourceDefinitionByNameAndUrl(children, resourceDefinition.url + "/" + resourceDefinition.children);
                            treeBranchProjection = getTreeBranchProjection(childDefinition);
                            branch.children = (data.value ? data.value : data).map(function (d) {
                                var csmName = getCsmNameFromIdAndName(d.id, d.name);
                                var label = treeBranchProjection.getLabel(d, csmName);
                                var treeBranch = new TreeBranch(label);
                                treeBranch.resourceDefinition = childDefinition;
                                treeBranch.value = (d.subscriptionId ? d.subscriptionId : csmName);
                                treeBranch.is_leaf = (childDefinition.children ? false : true);
                                treeBranch.elementUrl = branch.elementUrl + "/" + (d.subscriptionId ? d.subscriptionId : csmName);
                                treeBranch.sortValue = treeBranchProjection.getSortKey(d, label);
                                treeBranch.iconNameOverride = treeBranchProjection.getIconNameOverride(d);
                                return treeBranch;
                            }).sort(function (a, b) {
                                return a.sortValue.localeCompare(b.sortValue) * treeBranchProjection.sortOrder;
                            });
                            return [3 /*break*/, 10];
                        case 8:
                            err_1 = _a.sent();
                            console.log(err_1);
                            return [3 /*break*/, 10];
                        case 9:
                            endExpandingTreeItem(branch, originalIcon);
                            $timeout(function () { $scope.treeControl.expand_branch(branch); });
                            if (branch.children && branch.children.length === 1 && !dontExpandChildren) {
                                $timeout(function () { $scope.expandResourceHandler($scope.treeControl.get_first_child(branch)); });
                            }
                            return [7 /*endfinally*/];
                        case 10: return [2 /*return*/, Promise.resolve()];
                    }
                });
            }); };
            function keepChildrenBasedOnExistingResources(branch, childName, providersFilter) {
                var parent = $scope.treeControl.get_parent_branch(branch);
                var keepChild = true;
                if (branch.label === "providers") {
                    // filter the providers by providersFilter
                    if (providersFilter) {
                        var currentResourceGroup = (parent && isItemOf(parent, "resourceGroups") ? parent.label : undefined);
                        if (currentResourceGroup) {
                            var currentResourceGroupProviders = providersFilter[currentResourceGroup.toUpperCase()];
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
                        parent.currentResourceGroupProviders[branch.label.toUpperCase()].some(function (c) { return c.toUpperCase() === childName.toUpperCase(); });
                }
                return keepChild;
            }
            $scope.tenantSelect = function () {
                window.location.href = "api/tenants/" + $scope.selectedTenant.id;
            };
            $scope.$createObservableFunction("delayResourceSearch")
                .flatMapLatest(function (event) {
                // set 300 millionseconds gap, since user might still typing, 
                // we want to trigger search only when user stop typing
                return $timeout(function () { return event; }, 300);
            }).subscribe(function (event) {
                if (!event || event.keyCode !== 13 /* enter key will handle by form-submit */) {
                    $scope.resourceSearcher.resourceSearch();
                }
            });
            $scope.selectResourceSearch = function (item) {
                var itemId = item.id;
                var currentSelectedBranch = $scope.treeControl.get_selected_branch();
                if (currentSelectedBranch) {
                    var commonAncestor = $scope.treeControl.get_selected_branch().getCommonAncestorBranch(item.id);
                    while (currentSelectedBranch != null && !currentSelectedBranch.elementUrl.toLowerCase().endsWith(commonAncestor)) {
                        currentSelectedBranch = $scope.treeControl.get_parent_branch(currentSelectedBranch);
                    }
                    if (currentSelectedBranch) {
                        $scope.treeControl.select_branch(currentSelectedBranch);
                        var subscriptionTokenIndex = currentSelectedBranch.elementUrl.toLowerCase().indexOf("/subscriptions");
                        var currentSelectedBranchPath = currentSelectedBranch.elementUrl.substr(subscriptionTokenIndex);
                        itemId = itemId.substr(currentSelectedBranchPath.length);
                    }
                    else {
                        // shouldn`t happen, but if it did happen, we fallback to collapse_all
                        $scope.treeControl.collapse_all();
                    }
                }
                handlePath(itemId.substr(1));
                $scope.resourceSearchModel.turnOffSuggestions();
            };
            $scope.enterCreateMode = function () {
                $scope.createMode = true;
                $scope.editorCollection.resize(Editor.CreateEditor);
                delete $scope.createModel.createdResourceName;
            };
            $scope.leaveCreateMode = function () {
                $scope.createMode = false;
                $scope.editorCollection.resize(Editor.ResponseEditor);
                $scope.editorCollection.resize(Editor.RequestEditor);
            };
            $scope.clearCreate = function () {
                delete $scope.createModel.createdResourceName;
                $scope.editorCollection.setValue(Editor.CreateEditor, StringUtils.stringify($scope.createMetaData));
            };
            function finalizeCreate() {
                var selectedBranch = $scope.treeControl.get_selected_branch();
                $timeout(function () { $scope.treeControl.collapse_branch(selectedBranch); });
                if (selectedBranch.uid === $scope.treeControl.get_selected_branch().uid) {
                    $timeout(function () { $scope.selectResourceHandler($scope.treeControl.get_selected_branch(), undefined); });
                    ExplorerScreen.fadeInAndFadeOutSuccess();
                }
                $timeout(function () { $scope.expandResourceHandler(selectedBranch); }, 50);
            }
            function invokeCreateErrorCallback(response) {
                $timeout(function () { $scope.createError = response.data ? StringUtils.syntaxHighlight(response.data) : StringUtils.syntaxHighlight(response.message); });
                ExplorerScreen.fadeInAndFadeOutError();
            }
            function invokeCreateFinallyCallback() {
                $timeout(function () { $scope.invoking = false; $scope.loading = false; });
            }
            function setStateForInvokeCreate() {
                delete $scope.createError;
                $scope.invoking = true;
            }
            function doInvokeCreate(selectedResource, event) {
                return __awaiter(this, void 0, void 0, function () {
                    var resourceName, action, repository, error_3;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                resourceName = $scope.createModel.createdResourceName;
                                if (!resourceName) return [3 /*break*/, 7];
                                setStateForInvokeCreate();
                                action = new Action("PUT", "", "");
                                if (!$scope.readOnlyMode) return [3 /*break*/, 1];
                                if (!action.isGetAction()) {
                                    ExplorerScreen.showReadOnlyConfirmation(event);
                                }
                                return [3 /*break*/, 6];
                            case 1:
                                repository = new ArmClientRepository($http);
                                _a.label = 2;
                            case 2:
                                _a.trys.push([2, 4, 5, 6]);
                                return [4 /*yield*/, repository.invokeCreate(resourceName, selectedResource, action, $scope.editorCollection)];
                            case 3:
                                _a.sent();
                                finalizeCreate();
                                return [3 /*break*/, 6];
                            case 4:
                                error_3 = _a.sent();
                                invokeCreateErrorCallback(error_3);
                                return [3 /*break*/, 6];
                            case 5:
                                invokeCreateFinallyCallback();
                                return [7 /*endfinally*/];
                            case 6: return [3 /*break*/, 8];
                            case 7:
                                invokeCreateErrorCallback({ message: "{Resource Name} can't be empty" });
                                _a.label = 8;
                            case 8: return [2 /*return*/, Promise.resolve().then(invokeCreateFinallyCallback)];
                        }
                    });
                });
            }
            $scope.invokeCreate = function (selectedResource, event) {
                doInvokeCreate(selectedResource, event);
            };
            function refreshContent() {
                $scope.selectResourceHandler($scope.treeControl.get_selected_branch(), undefined);
            }
            ;
            $scope.enterDataTab = function () {
                if ($scope.editorCollection) {
                    $scope.editorCollection.resize(Editor.ResponseEditor);
                    $scope.editorCollection.resize(Editor.RequestEditor);
                }
            };
            $scope.hideDocs = function () {
                var newWidth = $("#doc").outerWidth(true) + $("#content").outerWidth(true);
                $("#content").css({ width: newWidth });
                $("#doc").hide();
                $("#doc-resizer").hide();
                $("#show-doc-btn").show();
            };
            $scope.showDocs = function () {
                $("#doc").show();
                $("#doc-resizer").show();
                var newWidth = $("#content").outerWidth(true) - $("#doc").outerWidth(true);
                $("#content").css({ width: newWidth });
                $("#show-doc-btn").hide();
            };
            $scope.hideConfirm = function () {
                $(".confirm-box").fadeOut(300);
                $('#dark-blocker').hide();
            };
            $scope.setReadOnlyMode = function (readOnlyMode) {
                $scope.readOnlyMode = readOnlyMode;
                $.cookie("readOnlyMode", readOnlyMode, { expires: 10 * 365, path: '/' });
            };
            $scope.toggleEditMode = function () {
                $scope.editMode = !$scope.editMode;
                $timeout(function () {
                    try {
                        $scope.editorCollection.resize(Editor.ResponseEditor);
                        $scope.editorCollection.resize(Editor.RequestEditor);
                    }
                    catch (error) {
                        console.log(error);
                    }
                });
            };
            $scope.showHttpVerb = function (verb) {
                return ((verb === "GET" || verb === "POST") && !$scope.editMode) || ((verb === "PUT" || verb === "PATCH") && $scope.editMode);
            };
            $scope.logout = function () {
                window.location.href = "/logout";
            };
            $scope.refresh = function () {
                window.location.href = "/";
            };
            // https://www.reddit.com/r/web_design/comments/33kxgf/javascript_copying_to_clipboard_is_easier_than
            $scope.copyResUrlToClipboard = function (text) {
                // We can only use .select() on a textarea,
                // so let's temporarily create one
                var textField = document.createElement('textarea');
                textField.innerText = text;
                document.body.appendChild(textField);
                textField.select();
                if (document.execCommand('copy')) {
                    // Cycle resource URL color for visual feedback
                    $scope.resUrlColor = '#718c00'; // a soft green
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
            // Get resourcesDefinitions
            // no await since we don't need this to complete before continuing with rest of init
            initResourcesDefinitions();
            // Get tenants list
            initTenants();
            initSettings();
            initUser();
            initResourceSearch();
            function initResourceSearch() {
                var repository = new ArmClientRepository($http);
                $scope.resourceSearchModel = new ResourceSearchDataModel();
                $scope.resourceSearcher = new ResourceSearcher($scope.resourceSearchModel, repository);
                // hide suggestion list when user click somewhere else
                $("body").click(function (event) {
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
                return __awaiter(this, void 0, void 0, function () {
                    var currentUser, repository, userTokenResponse, userToken, error_4;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, 3, 4]);
                                repository = new ArmClientRepository($http);
                                return [4 /*yield*/, repository.getUserToken()];
                            case 1:
                                userTokenResponse = _a.sent();
                                userToken = userTokenResponse.data;
                                currentUser = {
                                    name: (userToken.given_name && userToken.family_name ? userToken.given_name + " " + userToken.family_name : undefined) || userToken.name || userToken.email || userToken.unique_name || "User",
                                    imageUrl: "https://secure.gravatar.com/avatar/" + CryptoJS.MD5((userToken.email || userToken.unique_name || userToken.upn || userToken.name || "").toString()) + ".jpg?d=mm",
                                    email: "(" + (userToken.upn ? userToken.upn : userToken.email) + ")"
                                };
                                return [3 /*break*/, 4];
                            case 2:
                                error_4 = _a.sent();
                                currentUser = {
                                    name: "User",
                                    imageUrl: "https://secure.gravatar.com/avatar/.jpg?d=mm"
                                };
                                return [3 /*break*/, 4];
                            case 3:
                                $timeout(function () { $scope.user = currentUser; });
                                return [7 /*endfinally*/];
                            case 4: return [2 /*return*/];
                        }
                    });
                });
            }
            function initSettings() {
                if ($.cookie("readOnlyMode") !== undefined) {
                    $scope.setReadOnlyMode($.cookie("readOnlyMode") === "true");
                }
            }
            function expandChild(child, rest, selectedBranch) {
                return __awaiter(this, void 0, void 0, function () {
                    var top_1, expandPromise;
                    return __generator(this, function (_a) {
                        if (!child) {
                            if (selectedBranch) {
                                top_1 = document.getElementById("expand-icon-" + selectedBranch.uid).documentOffsetTop() - ((window.innerHeight - 50 /*nav bar height*/) / 2);
                                $("#sidebar").scrollTop(top_1);
                            }
                        }
                        else {
                            $scope.treeControl.select_branch(child);
                            child = $scope.treeControl.get_selected_branch();
                            expandPromise = void 0;
                            if (child && $.isArray(child.children) && child.children.length > 0) {
                                expandPromise = Promise.resolve();
                            }
                            else {
                                expandPromise = $scope.expandResourceHandler(child, undefined, undefined, true);
                            }
                            // use .then.catch.then to simulate finally
                            expandPromise.then()["catch"]().then(function () { $timeout(function () { handlePath(rest); }); });
                        }
                        return [2 /*return*/];
                    });
                });
            }
            function handlePath(path) {
                return __awaiter(this, void 0, void 0, function () {
                    var index, current, rest, selectedBranch, matches, err_2, child;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!(path.length > 0)) return [3 /*break*/, 7];
                                index = path.indexOf("/");
                                index = (index === -1 ? undefined : index);
                                current = path.substring(0, index);
                                rest = path.substring(index + 1);
                                selectedBranch = $scope.treeControl.get_selected_branch();
                                matches = [];
                                if (!selectedBranch) return [3 /*break*/, 5];
                                if (!!selectedBranch.expanded) return [3 /*break*/, 4];
                                _a.label = 1;
                            case 1:
                                _a.trys.push([1, 3, , 4]);
                                return [4 /*yield*/, $scope.expandResourceHandler(selectedBranch, undefined, undefined, true)];
                            case 2:
                                _a.sent();
                                return [3 /*break*/, 4];
                            case 3:
                                err_2 = _a.sent();
                                console.log(err_2);
                                return [3 /*break*/, 4];
                            case 4:
                                matches = $scope.treeControl.get_children(selectedBranch).filter(function (e) { return current.toLocaleUpperCase() === (e.value ? e.value.toLocaleUpperCase() : e.label.toLocaleUpperCase()); });
                                return [3 /*break*/, 6];
                            case 5:
                                matches = $scope.treeControl.get_roots().filter(function (e) { return e.label.toLocaleUpperCase() === current.toLocaleUpperCase(); });
                                _a.label = 6;
                            case 6:
                                child = (matches.length > 0 ? matches[0] : undefined);
                                expandChild(child, rest, selectedBranch);
                                _a.label = 7;
                            case 7: return [2 /*return*/];
                        }
                    });
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
                var currentBranch = $scope.treeControl.get_selected_branch();
                var parent = $scope.treeControl.get_parent_branch(currentBranch);
                if (response.data)
                    $scope.actionResponse = StringUtils.syntaxHighlight(response.data);
                // async DELETE returns 202. That might fail later. So don't remove from the tree
                if (action.isDeleteAction() && response.status === 200 /* OK */) {
                    if (currentBranch.uid === $scope.treeControl.get_selected_branch().uid) {
                        $timeout(function () { $scope.treeControl.select_branch(parent); scrollToTop(900); });
                    }
                    parent.children = parent.children.filter(function (branch) { return branch.uid !== currentBranch.uid; });
                }
                else {
                    $timeout(function () { $scope.selectResourceHandler($scope.treeControl.get_selected_branch(), undefined); });
                }
                ExplorerScreen.fadeInAndFadeOutSuccess();
            }
            function invokeActionErrorCallback(response) {
                $timeout(function () { $scope.actionResponse = response.data ? StringUtils.syntaxHighlight(response.data) : StringUtils.syntaxHighlight(response.message); });
                ExplorerScreen.fadeInAndFadeOutError();
            }
            function invokeActionFinallyCallback() {
                $timeout(function () { $scope.loading = false; $scope.invoking = false; });
            }
            function doInvokeAction(selectedResource, action, event, confirmed) {
                return __awaiter(this, void 0, void 0, function () {
                    var repository, invokeResponse, error_5;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                setStateForInvokeAction();
                                if (!$scope.readOnlyMode) return [3 /*break*/, 1];
                                if (!action.isGetAction()) {
                                    ExplorerScreen.showReadOnlyConfirmation(event);
                                    // no finally in es6 promise. use a resolved promise with then instead
                                    return [2 /*return*/, Promise.resolve("Write attempted in read only mode").then(invokeActionFinallyCallback)];
                                }
                                return [3 /*break*/, 7];
                            case 1:
                                if (!(action.isDeleteAction() && !confirmed)) return [3 /*break*/, 2];
                                ExplorerScreen.showDeleteConfirmation(event, function (deleteConfirmationHandler) {
                                    deleteConfirmationHandler.stopPropagation();
                                    deleteConfirmationHandler.preventDefault();
                                    $scope.hideConfirm();
                                    doInvokeAction(selectedResource, action, deleteConfirmationHandler, true /*confirmed*/);
                                });
                                return [2 /*return*/, Promise.resolve("Delete attempted pre-confirmation").then(invokeActionFinallyCallback)];
                            case 2:
                                repository = new ArmClientRepository($http);
                                _a.label = 3;
                            case 3:
                                _a.trys.push([3, 5, 6, 7]);
                                return [4 /*yield*/, repository.invokeAction(selectedResource, action, $scope.actionsModel)];
                            case 4:
                                invokeResponse = _a.sent();
                                finalizeDelete(action, invokeResponse);
                                return [3 /*break*/, 7];
                            case 5:
                                error_5 = _a.sent();
                                invokeActionErrorCallback(error_5);
                                return [3 /*break*/, 7];
                            case 6:
                                invokeActionFinallyCallback();
                                return [7 /*endfinally*/];
                            case 7: return [2 /*return*/, Promise.resolve("doInvokeAction Complete").then(invokeActionFinallyCallback)];
                        }
                    });
                });
            }
            function getCsmNameFromIdAndName(id, name) {
                var splited = (id ? decodeURIComponent(id) : name).split("/");
                return splited[splited.length - 1];
            }
            function scrollToTop(delay) {
                $timeout(function () { $("html, body").scrollTop(0); }, delay);
            }
            function initTenants() {
                return __awaiter(this, void 0, void 0, function () {
                    var repository, tenantCollection_1, error_6;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, , 3]);
                                repository = new ArmClientRepository($http);
                                tenantCollection_1 = new TenantCollection(repository);
                                return [4 /*yield*/, tenantCollection_1.buildTenants()];
                            case 1:
                                _a.sent();
                                $timeout(function () { $scope.tenants = tenantCollection_1.getTenants(); $scope.selectedTenant = tenantCollection_1.getSelectedTenant(); });
                                return [3 /*break*/, 3];
                            case 2:
                                error_6 = _a.sent();
                                console.log(error_6);
                                return [3 /*break*/, 3];
                            case 3: return [2 /*return*/];
                        }
                    });
                });
            }
            function initResourcesDefinitions() {
                return __awaiter(this, void 0, void 0, function () {
                    var repository, error_7;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 2, 3, 4]);
                                repository = new ArmClientRepository($http);
                                $scope.resourceDefinitionsCollection = new ResourceDefinitionCollection(repository);
                                return [4 /*yield*/, $scope.resourceDefinitionsCollection.buildResourceDefinitions()];
                            case 1:
                                _a.sent();
                                // Initializes the root nodes for the tree
                                // Since resources are updated async let angular known new update should be $digest-ed whenever we get around to updating resources
                                $timeout(function () { $scope.resources = $scope.resourceDefinitionsCollection.getTreeNodes(); });
                                return [3 /*break*/, 4];
                            case 2:
                                error_7 = _a.sent();
                                console.log(error_7);
                                return [3 /*break*/, 4];
                            case 3:
                                $timeout(function () { handlePath($location.path().substring(1)); });
                                return [7 /*endfinally*/];
                            case 4: return [2 /*return*/];
                        }
                    });
                });
            }
            function isItemOf(branch, elementType) {
                var parent = $scope.treeControl.get_parent_branch(branch);
                return (parent && parent.resourceDefinition.resourceName === elementType);
            }
            function showExpandingTreeItemIcon(row, branch) {
                var originalTreeIcon = row ? row.tree_icon : "icon-plus  glyphicon glyphicon-plus fa fa-plus";
                $(document.getElementById("expand-icon-" + branch.uid)).removeClass(originalTreeIcon).addClass("fa fa-refresh fa-spin");
                return originalTreeIcon;
            }
            function endExpandingTreeItem(branch, originalTreeIcon) {
                $(document.getElementById("expand-icon-" + branch.uid)).removeClass("fa fa-spinner fa-spin").addClass(originalTreeIcon);
            }
            function getTreeBranchProjection(childDefinition) {
                // look up to see whether the current node in the tree has any overrides for the
                // display label or sort key/order
                var override = ClientConfig.getOverrideFor(childDefinition);
                // Apply default behaviors
                //  - label uses displayname with a fallback to csmName
                //  - sort is by label
                if (override.getLabel == null) {
                    override.getLabel = function (d, csmName) { return (d.displayName ? d.displayName : csmName); };
                }
                if (override.getSortKey == null) {
                    override.getSortKey = function (d, label) { return label; };
                }
                if (override.getIconNameOverride == null) {
                    override.getIconNameOverride = function (d) { return null; };
                }
                return override;
            }
        }])
        .config(function ($locationProvider) {
        $locationProvider.html5Mode(true);
    });
    // Global JS fixes
    $('label.tree-toggler').click(function () {
        $(this).parent().children('ul.tree').toggle(300);
    });
    $(document).mouseup(function (e) {
        var container = $(".confirm-box");
        if (!container.is(e.target) && container.has(e.target).length === 0) {
            container.fadeOut(300);
            $('#dark-blocker').hide();
        }
    });
})(armExplorer || (armExplorer = {}));
var ArmClientRepository = /** @class */ (function () {
    function ArmClientRepository($http) {
        this.$http = $http;
    }
    ArmClientRepository.prototype.getApplicableProvidersAsync = function () {
        return __awaiter(this, void 0, void 0, function () {
            var applicableProvidersConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        applicableProvidersConfig = { method: "GET", url: "api/providers" };
                        return [4 /*yield*/, this.$http(applicableProvidersConfig)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ArmClientRepository.prototype.getApplicableOperations = function (providers) {
        return __awaiter(this, void 0, void 0, function () {
            var postProviders;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        postProviders = { method: "POST", url: "api/all-operations", data: JSON.stringify(providers.data) };
                        return [4 /*yield*/, this.$http(postProviders)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ArmClientRepository.prototype.getTenants = function () {
        return __awaiter(this, void 0, void 0, function () {
            var tenantsConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tenantsConfig = { method: "GET", url: "api/tenants" };
                        return [4 /*yield*/, this.$http(tenantsConfig)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ArmClientRepository.prototype.getUserToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            var userTokenConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        userTokenConfig = { method: "GET", url: "api/token" };
                        return [4 /*yield*/, this.$http(userTokenConfig)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ArmClientRepository.prototype.searchKeyword = function (keyword) {
        return __awaiter(this, void 0, void 0, function () {
            var searchConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchConfig = { method: "GET", url: "api/search?keyword=" + keyword };
                        return [4 /*yield*/, this.$http(searchConfig)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ArmClientRepository.prototype.invokeAction = function (selectedResource, action, actionsModel) {
        return __awaiter(this, void 0, void 0, function () {
            var invokeConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        invokeConfig = {
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
                        return [4 /*yield*/, this.$http(invokeConfig)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ArmClientRepository.prototype.invokeHttp = function (httpConfig) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.$http(httpConfig)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ArmClientRepository.prototype.invokePut = function (selectedResource, action, editorCollection) {
        return __awaiter(this, void 0, void 0, function () {
            var userObject, invokePutConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        userObject = editorCollection.getValue(Editor.RequestEditor, true);
                        invokePutConfig = {
                            method: "POST",
                            url: "api/operations",
                            data: {
                                Url: selectedResource.putUrl,
                                HttpMethod: action.httpMethod,
                                RequestBody: userObject,
                                ApiVersion: selectedResource.apiVersion
                            }
                        };
                        return [4 /*yield*/, this.$http(invokePutConfig)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ArmClientRepository.prototype.invokeCreate = function (newResourceName, selectedResource, action, editorCollection) {
        return __awaiter(this, void 0, void 0, function () {
            var userObject, invokeCreateConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        userObject = editorCollection.getValue(Editor.CreateEditor, true);
                        invokeCreateConfig = {
                            method: "POST",
                            url: "api/operations",
                            data: {
                                Url: selectedResource.putUrl + "/" + newResourceName,
                                HttpMethod: "PUT",
                                RequestBody: userObject,
                                ApiVersion: selectedResource.apiVersion
                            }
                        };
                        return [4 /*yield*/, this.$http(invokeCreateConfig)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ArmClientRepository.prototype.getProvidersForSubscription = function (subscriptionId) {
        return __awaiter(this, void 0, void 0, function () {
            var getProvidersConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        getProvidersConfig = {
                            method: "GET",
                            url: "api/operations/providers/" + subscriptionId
                        };
                        return [4 /*yield*/, this.$http(getProvidersConfig)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return ArmClientRepository;
}());
var ClientConfig = /** @class */ (function () {
    function ClientConfig() {
    }
    ClientConfig.getOverrideFor = function (childDefinition) {
        var overrides = ClientConfig.treeBranchDataOverrides.filter(function (t) { return childDefinition.url.endsWith(t.childDefinitionUrlSuffix); });
        var override = overrides.length > 0
            ? overrides[0]
            : {
                childDefinitionUrlSuffix: null,
                getLabel: null,
                getSortKey: null,
                getIconNameOverride: null,
                sortOrder: 1
            };
        return override;
    };
    // Define any overrides for display label and sort key/order for tree nodes
    // Rule matching is performing by checking whether the childDefinition.url ends with the childDefinitionUrlSuffix
    //  - getLabel is called to provide the node label. Provide a function that takes the node data and csmName and returns the label
    //  - getSortKey is called to provide the node sort key. Provide a function that takes the node data and label and returns the sort key
    //  - sortOrder: 1 to sort ascending, -1 to sort descending
    ClientConfig.treeBranchDataOverrides = [
        {
            childDefinitionUrlSuffix: "providers/Microsoft.Resources/deployments/{name}",
            getLabel: null,
            getSortKey: function (d, label) { return d.properties.timestamp; },
            getIconNameOverride: function (d) {
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
            getLabel: function (d, csmName) {
                if (d.properties.targetResource !== undefined && d.properties.targetResource.resourceName !== undefined) {
                    return d.properties.targetResource.resourceName + " (" + d.properties.targetResource.resourceType + ")";
                }
                else {
                    return d.properties.provisioningOperation + " (" + d.operationId + ")";
                }
            },
            getSortKey: function (d, label) { return d.properties.timestamp; },
            getIconNameOverride: function (d) {
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
        onLoad: function (_ace) {
            _ace.setOptions({
                maxLines: Infinity,
                fontSize: 15,
                wrap: "free",
                showPrintMargin: false
            });
            _ace.resize();
        }
    };
    return ClientConfig;
}());
var DocumentationGenerator = /** @class */ (function () {
    function DocumentationGenerator() {
    }
    DocumentationGenerator.getDocumentationFlatArray = function (editorData, doc) {
        var docArray = [];
        if (doc) {
            doc = (doc.properties ? doc.properties : (doc.value ? doc.value[0].properties : {}));
        }
        if (editorData && doc) {
            editorData = (editorData.properties ? editorData.properties : ((editorData.value && editorData.value.length > 0) ? editorData.value[0].properties : {}));
            var set = {};
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
    };
    return DocumentationGenerator;
}());
var Editor;
(function (Editor) {
    Editor[Editor["ResponseEditor"] = 0] = "ResponseEditor";
    Editor[Editor["RequestEditor"] = 1] = "RequestEditor";
    Editor[Editor["CreateEditor"] = 2] = "CreateEditor";
    Editor[Editor["AnsibleEditor"] = 3] = "AnsibleEditor";
    Editor[Editor["PowershellEditor"] = 4] = "PowershellEditor";
    Editor[Editor["AzureCliEditor"] = 5] = "AzureCliEditor";
})(Editor || (Editor = {}));
var EditorCollection = /** @class */ (function () {
    function EditorCollection() {
        this.editors = [null, null, null, null, null, null];
        this.editors[Editor.ResponseEditor] = ace.edit("response-json-editor");
        this.editors[Editor.RequestEditor] = ace.edit("request-json-editor");
        this.editors[Editor.CreateEditor] = ace.edit("json-create-editor");
        this.editors[Editor.AnsibleEditor] = ace.edit("ansible-editor");
        this.editors.length = 4;
        //        this.editors[Editor.PowershellEditor] = ace.edit("powershell-editor");
        //        this.editors[Editor.AzureCliEditor] = ace.edit("azurecli-editor");
    }
    EditorCollection.prototype.isHidden = function (editor) {
        return editor === Editor.AzureCliEditor || editor === Editor.PowershellEditor;
    };
    EditorCollection.prototype.getValue = function (editor, cleanObject) {
        var currentEditor = this.editors[editor];
        var value = JSON.parse(currentEditor.getValue());
        if (cleanObject)
            ObjectUtils.cleanObject(value);
        return value;
    };
    EditorCollection.prototype.setValue = function (editor, stringValue) {
        if (this.isHidden(editor)) {
            return;
        }
        var currentEditor = this.editors[editor];
        currentEditor.setValue(stringValue);
        currentEditor.session.selection.clearSelection();
        currentEditor.moveCursorTo(0, 0);
    };
    EditorCollection.prototype.setMode = function (editor, mode) {
        if (this.isHidden(editor)) {
            return;
        }
        var currentEditor = this.editors[editor];
        currentEditor.getSession().setMode(mode);
    };
    EditorCollection.prototype.setTheme = function (editor, theme) {
        if (this.isHidden(editor)) {
            return;
        }
        var currentEditor = this.editors[editor];
        currentEditor.setTheme(theme);
    };
    EditorCollection.prototype.setShowGutter = function (editor, showGutter) {
        if (this.isHidden(editor)) {
            return;
        }
        var currentEditor = this.editors[editor];
        currentEditor.renderer.setShowGutter(showGutter);
    };
    EditorCollection.prototype.setReadOnly = function (editor, setBackground) {
        if (this.isHidden(editor)) {
            return;
        }
        var currentEditor = this.editors[editor];
        setBackground = typeof setBackground !== 'undefined' ? setBackground : true;
        currentEditor.setOptions({
            readOnly: true,
            highlightActiveLine: false,
            highlightGutterLine: false
        });
        var virtualRenderer = currentEditor.renderer;
        virtualRenderer.$cursorLayer.element.style.opacity = 0;
        virtualRenderer.setStyle("disabled", true);
        if (setBackground)
            currentEditor.container.style.background = "#f5f5f5";
        currentEditor.blur();
    };
    EditorCollection.prototype.apply = function (callbackFn) {
        this.editors.map(callbackFn);
    };
    EditorCollection.prototype.resize = function (editor) {
        if (this.isHidden(editor)) {
            return;
        }
        var currentEditor = this.editors[editor];
        currentEditor.resize();
    };
    EditorCollection.prototype.configureEditors = function () {
        this.editors.map(function (editor) {
            editor.setOptions({
                maxLines: Infinity,
                fontSize: 15,
                wrap: "free",
                showPrintMargin: false
            });
            editor.setTheme("ace/theme/tomorrow");
            editor.getSession().setMode("ace/mode/json");
            editor.getSession().setNewLineMode("windows");
            var commandManager = editor.commands;
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
    };
    return EditorCollection;
}());
var ExplorerScreen = /** @class */ (function () {
    function ExplorerScreen() {
    }
    ExplorerScreen.showReadOnlyConfirmation = function (event) {
        if (event) {
            var clickedButton = $(event.currentTarget);
            var readonlyConfirmation = $("#readonly-confirm-box");
            // I don't know why the top doesn't center the value for the small buttons but does for the large ones
            // add an 8px offset if the button outer height < 40
            var offset = (clickedButton.outerHeight() < 40 ? 8 : 0);
            readonlyConfirmation.css({ top: (clickedButton.offset().top - clickedButton.outerHeight(true) - offset) + 'px', left: (clickedButton.offset().left + clickedButton.outerWidth()) + 'px' });
            $("#dark-blocker").show();
            readonlyConfirmation.show();
        }
    };
    ExplorerScreen.showDeleteConfirmation = function (event, deleteClickHandler) {
        var deleteButton = $(event.currentTarget);
        var deleteConfirmation = $("#delete-confirm-box");
        deleteConfirmation.css({ top: (deleteButton.offset().top - (((deleteButton.outerHeight() + 10) / 2))) + 'px', left: (deleteButton.offset().left + deleteButton.outerWidth()) + 'px' });
        $("#yes-delete-confirm").off("click").click(deleteClickHandler);
        $("#dark-blocker").show();
        deleteConfirmation.show();
    };
    ExplorerScreen.fadeInAndFadeOutSuccess = function () {
        setTimeout(function () {
            $(".success-marker").fadeIn(1500);
            setTimeout(function () {
                $(".success-marker").fadeOut(1500);
            }, 1200);
        }, 500);
    };
    ExplorerScreen.fadeInAndFadeOutError = function () {
        setTimeout(function () {
            $(".failure-marker").fadeIn(1500);
            setTimeout(function () {
                $(".failure-marker").fadeOut(1500);
            }, 1200);
        }, 500);
    };
    return ExplorerScreen;
}());
var ResourceDefinitionCollection = /** @class */ (function () {
    function ResourceDefinitionCollection(repository) {
        this.repository = repository;
        this.resourcesDefinitionsTable = [];
    }
    ResourceDefinitionCollection.prototype.isSupportedTreeNode = function (url) {
        var splits = url.split("/");
        return (splits.length === 4) && ResourceDefinitionCollection.supportedRootNodes.includes(splits[3].toLowerCase());
    };
    ResourceDefinitionCollection.prototype.getTable = function () {
        return this.resourcesDefinitionsTable;
    };
    // sets the branch that is returned by observables
    // but only root nodes are created here. child nodes under 'providers' and 'subscriptions' are created in the tree itself
    ResourceDefinitionCollection.prototype.getTreeNodes = function () {
        var _this = this;
        return this.resourcesDefinitionsTable.filter(function (rd) { return _this.isSupportedTreeNode(rd.url); })
            .getUnique(function (rd) { return rd.url.split("/")[3]; }).map(function (urd) {
            var treeBranch = new TreeBranch(urd.url.split("/")[3]);
            treeBranch.resourceDefinition = urd;
            treeBranch.data = undefined;
            treeBranch.resource_icon = "fa fa-cube fa-fw";
            treeBranch.children = [];
            treeBranch.elementUrl = urd.url;
            treeBranch.sortValue = null;
            treeBranch.iconNameOverride = null;
            return treeBranch;
        });
    };
    ResourceDefinitionCollection.prototype.getResourceDefinitionByNameAndUrl = function (name, url) {
        var resourceDefinitions = this.getMatchingDefinitions(function (r) { return (r.resourceName === name) &&
            ((r.url.toLowerCase() === url.toLowerCase()) ||
                r.url.toLowerCase() === (url.toLowerCase() + "/" + name.toLowerCase())); });
        if (resourceDefinitions.length > 1) {
            console.log("ASSERT! duplicate ids in resourceDefinitionsTable");
            console.log(resourceDefinitions);
        }
        return resourceDefinitions[0];
    };
    ResourceDefinitionCollection.prototype.getMatchingDefinitions = function (predicate) {
        return this.resourcesDefinitionsTable.filter(predicate);
    };
    ResourceDefinitionCollection.prototype.fixOperationUrl = function (operation) {
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
    };
    ResourceDefinitionCollection.prototype.removeActionLessDefinitions = function () {
        for (var index = this.resourcesDefinitionsTable.length - 1; index >= 0; index--) {
            var resourceDefinition = this.resourcesDefinitionsTable[index];
            if (resourceDefinition.hideFromExplorerView()) {
                this.resourcesDefinitionsTable.splice(index, 1);
            }
        }
    };
    ResourceDefinitionCollection.prototype.buildResourceDefinitions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var applicableProviders, applicableOperationsResponse, applicableOperations;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.repository.getApplicableProvidersAsync()];
                    case 1:
                        applicableProviders = _a.sent();
                        return [4 /*yield*/, this.repository.getApplicableOperations(applicableProviders)];
                    case 2:
                        applicableOperationsResponse = _a.sent();
                        applicableOperations = applicableOperationsResponse.data;
                        applicableOperations.sort(function (a, b) { return a.Url.localeCompare(b.Url); });
                        applicableOperations.map(function (operation) {
                            //TODO: remove this
                            operation = _this.fixOperationUrl(operation);
                            _this.addOperation(operation);
                        });
                        this.sortChildren();
                        this.removeActionLessDefinitions();
                        return [2 /*return*/];
                }
            });
        });
    };
    ResourceDefinitionCollection.prototype.sortChildren = function () {
        this.resourcesDefinitionsTable.map(function (resourceDefinition) {
            var children = resourceDefinition.children;
            if (typeof children !== "string" && Array.isArray(children)) {
                children.sort();
            }
        });
    };
    ResourceDefinitionCollection.prototype.setParent = function (url, action, requestBody, requestBodyDoc, apiVersion) {
        var segments = url.split("/").filter(function (a) { return a.length !== 0; });
        var resourceName = segments.pop();
        var parentName = url.substring(0, url.lastIndexOf("/"));
        if (parentName === undefined || parentName === "" || resourceName === undefined)
            return;
        var parents = this.resourcesDefinitionsTable.filter(function (rd) { return rd.url.toLowerCase() === parentName.toLowerCase(); });
        var parent;
        if (parents.length === 1) {
            parent = parents[0];
            if (resourceName.match(/\{.*\}/g)) {
                // this means the parent.children should either be an undefined, or a string.
                // if it's anything else assert! because that means we have a mistake in our assumptions
                if (parent.children === undefined || typeof parent.children === "string") {
                    parent.children = resourceName;
                }
                else {
                    console.log("ASSERT1, typeof parent.children: " + typeof parent.children);
                }
            }
            else if (resourceName !== "list") {
                // this means that the resource is a pre-defined one. the parent.children should be undefined or array
                // if it's anything else assert! because that means we have a mistake in out assumptions
                if (parent.children === undefined) {
                    parent.children = [resourceName];
                }
                else if (Array.isArray(parent.children)) {
                    if (parent.children.filter(function (c) { return c === resourceName; }).length === 0) {
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
            //this means the parent is not in the array. Add it
            parent = this.addOperation(undefined, url.substring(0, url.lastIndexOf("/")));
            this.setParent(url);
        }
        if (action && parent && parent.actions.filter(function (c) { return c === action; }).length === 0) {
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
    };
    ResourceDefinitionCollection.prototype.addOperation = function (operation, url) {
        url = (operation ? operation.Url : url);
        url = url.replace(/{.*?}/g, "{name}");
        var segments = url.split("/").filter(function (a) { return a.length !== 0; });
        var resourceName = segments.pop();
        var addedElement = undefined;
        if (resourceName === "list" && operation && operation.HttpMethod === "POST") {
            // handle resources that has a "secure GET"
            this.setParent(url, "GETPOST", operation.RequestBody, operation.RequestBodyDoc, operation.ApiVersion);
            return addedElement;
        }
        else if (operation && (operation.MethodName.startsWith("Create") || operation.MethodName.startsWith("BeginCreate") || operation.MethodName.startsWith("Put")) && operation.HttpMethod === "PUT") {
            // handle resources that has a CreateOrUpdate
            this.setParent(url, "CREATE", operation.RequestBody, operation.RequestBodyDoc);
            if (operation.MethodName.indexOf("Updat") === -1) {
                return addedElement;
            }
        }
        //set the element itself
        var elements = this.resourcesDefinitionsTable.filter(function (r) { return r.url.toLowerCase() === url.toLowerCase(); });
        if (elements.length === 1) {
            //it's there, update it's actions
            if (operation) {
                elements[0].requestBody = (elements[0].requestBody ? elements[0].requestBody : operation.RequestBody);
                elements[0].apiVersion = operation.ApiVersion;
                if (elements[0].actions.filter(function (c) { return c === operation.HttpMethod; }).length === 0) {
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
        // set the parent recursively
        this.setParent(url);
        return addedElement;
    };
    ResourceDefinitionCollection.prototype.getActionsAndVerbs = function (treeBranch) {
        var _this = this;
        var actions = [];
        if (treeBranch.resourceDefinition.actions.includes("DELETE")) {
            actions.push(new Action("DELETE", "Delete", treeBranch.getGetActionUrl()));
        }
        var children = treeBranch.resourceDefinition.children;
        if (typeof children !== "string" && Array.isArray(children)) {
            children.filter(function (childString) {
                var matchingDefinition = _this.getMatchingDefinitions(function (r) { return (r.resourceName === childString) &&
                    ((r.url === treeBranch.resourceDefinition.url) || r.url === (treeBranch.resourceDefinition.url + "/" + childString)); });
                return matchingDefinition.length === 1;
            }).map(function (childString) {
                var resourceDefinition = _this.getResourceDefinitionByNameAndUrl(childString, treeBranch.resourceDefinition.url + "/" + childString);
                if (resourceDefinition.children === undefined && Array.isArray(resourceDefinition.actions) && resourceDefinition.actions.filter(function (actionName) { return actionName === "POST"; }).length > 0) {
                    var newAction = new Action("POST", resourceDefinition.resourceName, treeBranch.getGetActionUrl() + "/" + resourceDefinition.resourceName);
                    newAction.requestBody = (resourceDefinition.requestBody ? StringUtils.stringify(resourceDefinition.requestBody) : undefined);
                    newAction.query = resourceDefinition.query;
                    actions.push(newAction);
                }
            });
        }
        return actions;
    };
    ResourceDefinitionCollection.supportedRootNodes = ['providers', 'subscriptions'];
    return ResourceDefinitionCollection;
}());
var ResourceSearchDataModel = /** @class */ (function () {
    function ResourceSearchDataModel() {
        this.isSuggestListDisplay = false;
        this.suggestions = [];
    }
    ResourceSearchDataModel.prototype.turnOffSuggestions = function () {
        this.isSuggestListDisplay = false;
    };
    ResourceSearchDataModel.prototype.turnOnSuggestions = function () {
        this.isSuggestListDisplay = true;
    };
    ResourceSearchDataModel.prototype.addSuggestion = function (suggestion) {
        this.suggestions.push(suggestion);
    };
    ResourceSearchDataModel.prototype.setSuggestions = function (suggestions) {
        this.suggestions = suggestions;
    };
    ResourceSearchDataModel.prototype.getSuggestions = function () {
        return this.suggestions;
    };
    return ResourceSearchDataModel;
}());
var ResourceSearcher = /** @class */ (function () {
    function ResourceSearcher(resourceSearchModel, repository) {
        this.resourceSearchModel = resourceSearchModel;
        this.repository = repository;
        this.resourceSearchCache = new ResourcesCache(repository);
        this.resourceSearchCache.refresh();
    }
    ResourceSearcher.prototype.resourceSearch = function () {
        return __awaiter(this, void 0, void 0, function () {
            var keyword, results, searchResponse, searchResults;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // try to trigger cache refresh
                        this.resourceSearchCache.refresh();
                        keyword = this.resourceSearchModel.searchKeyword || "";
                        // remember last keyword
                        // when merge latest data into cache and if cache is for current keyword, will also update suggestion list
                        this.resourceSearchCache.setSearchKeyword(keyword);
                        results = this.resourceSearchCache.getSuggestions(keyword);
                        // check 2 way?
                        this.resourceSearchModel.setSuggestions(results);
                        if (this.resourceSearchModel.getSuggestions().length > 0) {
                            this.resourceSearchModel.turnOnSuggestions();
                        }
                        else {
                            this.resourceSearchModel.turnOffSuggestions();
                        }
                        if (!this.resourceSearchCache.getSearchKeyword()) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.repository.searchKeyword(keyword)];
                    case 1:
                        searchResponse = _a.sent();
                        searchResults = searchResponse.data;
                        // update local cache
                        searchResults.forEach(function (item) {
                            // if not in local cache, and user still searching with current keyword, append to suggestion list
                            if (keyword === _this.resourceSearchCache.data.currentKeyword && !_this.resourceSearchCache.data[item.id]) {
                                _this.resourceSearchModel.addSuggestion(item);
                            }
                            _this.resourceSearchCache.data[item.id] = item;
                        });
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return ResourceSearcher;
}());
var ResourcesCache = /** @class */ (function () {
    function ResourcesCache(repository) {
        this.repository = repository;
        this.suggestionSortFunc = function (a, b) {
            var result = a.type.compare(b.type, true /*ignore case*/);
            if (result === 0) {
                return a.name.compare(b.name, true /*ignore case*/);
            }
            return result;
        };
        this.isResourceCacheRefreshing = false;
        this.currentSearchKeyword = "";
    }
    ResourcesCache.prototype.cacheExpired = function () {
        return (Date.now() - this.timestamp) > ResourcesCache.resourceCacheExpiration;
    };
    ResourcesCache.prototype.clearCache = function () {
        this.data = {};
        this.timestamp = Date.now();
    };
    ResourcesCache.prototype.refresh = function () {
        return __awaiter(this, void 0, void 0, function () {
            var searchResponse, response, error_8;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, 4, 5]);
                        if (!(!this.cacheExpired() && !this.isResourceCacheRefreshing)) return [3 /*break*/, 2];
                        this.isResourceCacheRefreshing = true;
                        return [4 /*yield*/, this.repository.searchKeyword("")];
                    case 1:
                        searchResponse = _a.sent();
                        response = searchResponse.data;
                        this.clearCache();
                        // turn array into hashmap, to allow easily update cache later
                        response.forEach(function (item) { _this.data[item.id] = item; });
                        _a.label = 2;
                    case 2: return [3 /*break*/, 5];
                    case 3:
                        error_8 = _a.sent();
                        console.log(error_8);
                        return [3 /*break*/, 5];
                    case 4:
                        this.isResourceCacheRefreshing = false;
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ResourcesCache.prototype.setSearchKeyword = function (keyword) {
        this.currentSearchKeyword = keyword;
    };
    ResourcesCache.prototype.getSearchKeyword = function () {
        return this.currentSearchKeyword;
    };
    ResourcesCache.prototype.getSuggestions = function (keyword) {
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
    };
    ResourcesCache.resourceCacheExpiration = 5 * 60 * 1000; // 5 mintues
    return ResourcesCache;
}());
var ObjectUtils = /** @class */ (function () {
    function ObjectUtils() {
    }
    ObjectUtils.isEmptyObjectOrArray = function (obj) {
        if (typeof obj === "number" || typeof obj === "boolean")
            return false;
        if ($.isEmptyObject(obj))
            return true;
        if (obj === null || obj === "" || obj.length === 0)
            return true;
        return false;
    };
    ObjectUtils.flattenArray = function (array) {
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
    };
    ObjectUtils.flattenObject = function (prefix, object) {
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
    };
    ObjectUtils.sortByObject = function (toBeSorted, toSortBy) {
        if (toBeSorted === toSortBy)
            return toBeSorted;
        var sorted = {};
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
    };
    ObjectUtils.cleanObject = function (obj) {
        var hadProperties = (obj.properties !== undefined);
        ObjectUtils.recursiveCleanObject(obj);
        if (hadProperties && !obj.properties) {
            obj.properties = {};
        }
    };
    ObjectUtils.recursiveCleanObject = function (obj) {
        var _this = this;
        for (var property in obj) {
            if (obj.hasOwnProperty(property)) {
                if (typeof obj[property] === "string" && (/^\(.*\)$/.test(obj[property]))) {
                    delete obj[property];
                }
                else if (Array.isArray(obj[property])) {
                    var hadElements = obj[property].length > 0;
                    obj[property] = obj[property].filter(function (element) {
                        if (typeof element === "string" && (/^\(.*\)$/.test(element))) {
                            return false;
                        }
                        else if (typeof element === "object" && !$.isEmptyObject(element)) {
                            _this.recursiveCleanObject(element);
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
    };
    ObjectUtils.mergeObject = function (source, target) {
        for (var sourceProperty in source) {
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
    };
    ObjectUtils.getPsObjectFromJson = function (json, nestingLevel) {
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
    };
    return ObjectUtils;
}());
var StringUtils = /** @class */ (function () {
    function StringUtils() {
    }
    StringUtils.selectiveUrlencode = function (url) {
        return url.replace(/\#/g, '%23').replace(/\s/g, '%20');
    };
    StringUtils.stringify = function (object) {
        return JSON.stringify(object, undefined, 2);
    };
    StringUtils.escapeHtmlEntities = function (str) {
        return $('<div/>').text(str).html();
    };
    StringUtils.syntaxHighlight = function (json) {
        if (typeof json === "string")
            return StringUtils.escapeHtmlEntities(json);
        var str = this.stringify(json);
        str = StringUtils.escapeHtmlEntities(str);
        return str.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
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
    };
    return StringUtils;
}());
if (!Element.prototype.documentOffsetTop) {
    Element.prototype.documentOffsetTop = function () {
        return this.offsetTop + (this.offsetParent ? this.offsetParent.documentOffsetTop() : 0);
    };
}
var armExplorer;
(function (armExplorer) {
    var StringDictionary = /** @class */ (function () {
        function StringDictionary() {
            this.items = {};
        }
        StringDictionary.prototype.contains = function (key) {
            return this.items.hasOwnProperty(key);
        };
        StringDictionary.prototype.put = function (key, value) {
            this.items[key] = value;
        };
        StringDictionary.prototype.get = function (key) {
            return this.items[key];
        };
        return StringDictionary;
    }());
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
//http://devdocs.io/javascript/global_objects/array/indexof
Array.prototype.indexOfDelegate = function (predicate, fromIndex) {
    var k;
    // 1. Let O be the result of calling ToObject passing
    //    the this value as the argument.
    if (this == null) {
        throw new TypeError('"this" is null or not defined');
    }
    var O = Object(this);
    // 2. Let lenValue be the result of calling the Get
    //    internal method of O with the argument "length".
    // 3. Let len be ToUint32(lenValue).
    var len = O.length >>> 0;
    // 4. If len is 0, return -1.
    if (len === 0) {
        return -1;
    }
    // 5. If argument fromIndex was passed let n be
    //    ToInteger(fromIndex); else let n be 0.
    var n = +fromIndex || 0;
    if (Math.abs(n) === Infinity) {
        n = 0;
    }
    // 6. If n >= len, return -1.
    if (n >= len) {
        return -1;
    }
    // 7. If n >= 0, then Let k be n.
    // 8. Else, n<0, Let k be len - abs(n).
    //    If k is less than 0, then let k be 0.
    k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
    // 9. Repeat, while k < len
    while (k < len) {
        var kValue;
        // a. Let Pk be ToString(k).
        //   This is implicit for LHS operands of the in operator
        // b. Let kPresent be the result of calling the
        //    HasProperty internal method of O with argument Pk.
        //   This step can be combined with c
        // c. If kPresent is true, then
        //    i.  Let elementK be the result of calling the Get
        //        internal method of O with the argument ToString(k).
        //   ii.  Let same be the result of applying the
        //        Strict Equality Comparison Algorithm to
        //        searchElement and elementK.
        //  iii.  If same is true, return k.
        if (k in O && predicate(O[k])) {
            return k;
        }
        k++;
    }
    return -1;
};
if (!Array.prototype.some) {
    Array.prototype.some = function (fun /*, thisArg*/) {
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
var Action = /** @class */ (function () {
    function Action(httpMethod, name, url) {
        this.httpMethod = httpMethod;
        this.name = name;
        this.url = url;
    }
    Action.prototype.getRequestBody = function () {
        var requestBody = undefined;
        if (this.requestBody) {
            var editor = ace.edit(this.name + "-editor");
            requestBody = JSON.parse(editor.getValue());
        }
        return requestBody;
    };
    Action.prototype.getQueryString = function (actionsModel) {
        var queryString = undefined;
        if (this.query) {
            queryString = this.query.reduce(function (previous, current) {
                return previous + ((actionsModel[current] && actionsModel[current].trim() !== "")
                    ? "&" + current + "=" + actionsModel[current].trim()
                    : "");
            }, "");
        }
        return queryString;
    };
    Action.prototype.isGetAction = function () {
        return this.httpMethod === "GET" || (this.httpMethod === "POST" && this.url.split('/').last() === "list");
    };
    Action.prototype.isDeleteAction = function () {
        return this.httpMethod === "DELETE";
    };
    return Action;
}());
var ResourceDefinition = /** @class */ (function () {
    function ResourceDefinition() {
    }
    ResourceDefinition.prototype.getGetActions = function () {
        return this.actions.filter(function (a) { return (a === "GET" || a === "GETPOST"); });
    };
    ResourceDefinition.prototype.hasCreateAction = function () {
        return this.actions.includes("CREATE");
    };
    ResourceDefinition.prototype.hasPutOrPatchAction = function () {
        return this.actions.some(function (a) { return (a === "PATCH" || a === "PUT"); });
    };
    ResourceDefinition.prototype.hasPostAction = function () {
        return this.actions.some(function (a) { return (a === "POST"); });
    };
    ResourceDefinition.prototype.getEditable = function (responseData) {
        var editable;
        if (this.requestBody && ObjectUtils.isEmptyObjectOrArray(this.requestBody.properties)) {
            editable = responseData;
        }
        else {
            editable = jQuery.extend(true, {}, this.requestBody);
            var dataCopy = jQuery.extend(true, {}, responseData);
            ObjectUtils.mergeObject(dataCopy, editable);
        }
        return editable;
    };
    ResourceDefinition.prototype.hasRequestBody = function () {
        return !ObjectUtils.isEmptyObjectOrArray(this.requestBody);
    };
    ResourceDefinition.prototype.getDocBody = function () {
        return !ObjectUtils.isEmptyObjectOrArray(this.responseBodyDoc) ? this.responseBodyDoc : this.requestBodyDoc;
    };
    // Hide operation urls which do not have any actions on them to avoid confusing users. This could happen if we don't have swagger metadata for these operations.
    ResourceDefinition.prototype.hideFromExplorerView = function () {
        return (this.actions.length === 0) && !this.url.contains("providers", true);
    };
    return ResourceDefinition;
}());
var TenantCollection = /** @class */ (function () {
    function TenantCollection(repository) {
        this.repository = repository;
        this.tenants = [];
    }
    TenantCollection.prototype.getTenants = function () {
        return this.tenants;
    };
    TenantCollection.prototype.getSelectedTenant = function () {
        return this.selectedTenant;
    };
    TenantCollection.prototype.buildTenants = function () {
        return __awaiter(this, void 0, void 0, function () {
            var tenantsResponse, tenantsData;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.repository.getTenants()];
                    case 1:
                        tenantsResponse = _a.sent();
                        tenantsData = tenantsResponse.data;
                        this.tenants = tenantsData.map(function (tenant) {
                            return {
                                name: tenant.DisplayName + " (" + tenant.DomainName + ")",
                                id: tenant.TenantId,
                                current: tenant.Current
                            };
                        });
                        this.selectedTenant = this.tenants[this.tenants.indexOfDelegate(function (tenant) { return tenant.current; })];
                        return [2 /*return*/];
                }
            });
        });
    };
    return TenantCollection;
}());
var TreeBranch = /** @class */ (function () {
    function TreeBranch(label) {
        this.label = label;
    }
    TreeBranch.prototype.getGetHttpConfig = function () {
        var getActions = this.resourceDefinition.getGetActions();
        var httpConfig = null;
        if (getActions.length === 1) {
            var getAction = (getActions[0] === "GETPOST" ? "POST" : "GET");
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
    };
    TreeBranch.prototype.getGetActionUrl = function () {
        var getActions = this.resourceDefinition.getGetActions();
        var getActionUrl = null;
        if (getActions.length === 1) {
            if (getActions[0] === "GETPOST") {
                getActionUrl = this.elementUrl + "/list";
            }
            else {
                getActionUrl = this.elementUrl;
            }
        }
        return getActionUrl;
    };
    TreeBranch.prototype.findCommonAncestor = function (armIdA, armIdB) {
        var getTokensFromId = function (url) {
            url = url.toLowerCase();
            var removeTo = 0; // default is to remove first empty token "/subscriptions/3b94e3c2-9f5b-4a1e-9999-3e0945b8…a9/resourceGroups/brandoogroup3/providers/Microsoft.Web/sites/brandoosite3"
            if (url.startsWith("http")) {
                // "https://management.azure.com/subscriptions/3b94e3c2-9f5b-4a1e-9999-3e0945b8…a9/resourceGroups/brandoogroup3/providers/Microsoft.Web/sites/brandoosite3"
                // if start with "http/https", we will need to ignore the host name
                removeTo = 2;
            }
            var tokens = url.split('/');
            tokens.remove(0, removeTo);
            return tokens;
        };
        var tokensA = getTokensFromId(armIdA);
        var tokensB = getTokensFromId(armIdB);
        var len = Math.min(tokensA.length, tokensB.length);
        var commonAncestor = "";
        for (var i = 0; i < len; i++) {
            if (tokensA[i] === tokensB[i]) {
                commonAncestor += "/" + tokensA[i];
            }
            else {
                break;
            }
        }
        return commonAncestor;
    };
    TreeBranch.prototype.getCommonAncestorBranch = function (otherBranchUrl) {
        return this.findCommonAncestor(otherBranchUrl, this.elementUrl);
    };
    return TreeBranch;
}());
var armExplorer;
(function (armExplorer) {
    //http://stackoverflow.com/a/22253161
    angular.module('mp.resizer', []).directive('resizer', function ($document) {
        return function ($scope, $element, $attrs) {
            $element.on('mousedown', function (event) {
                event.preventDefault();
                $document.on('mousemove', mousemove);
                $document.on('mouseup', mouseup);
            });
            function mousemove(event) {
                if ($attrs.resizer == 'vertical') {
                    // Handle vertical resizer
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
                    // Handle horizontal resizer
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
    var ARMUrlParts;
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
        ARMUrlParts[ARMUrlParts["ResourceType1Value"] = 10] = "ResourceType1Value"; // start of resourcename followed by 12, 14,...(12, 14,... is optional)
    })(ARMUrlParts || (ARMUrlParts = {}));
    var ARMUrlParser = /** @class */ (function () {
        function ARMUrlParser(value, actions) {
            this.value = value;
            this.actions = actions;
            this.originalUrl = "";
            this.url = "";
            this.urlParts = [];
            this.url = value.url;
            this.originalUrl = value.url;
            if (this.isSecureGet(this.value.httpMethod, this.url)) {
                this.url = this.value.url.replace("/list", ""); // ignore /list since it is not part of resource url
            }
            this.urlParts = this.url.split("/");
        }
        ARMUrlParser.prototype.isSecureGet = function (httpMethod, url) {
            // sample url "https://management.azure.com/subscriptions/0000000-0000-0000-0000-0000000000000/resourceGroups/rgrp1/providers/Microsoft.Web/sites/WebApp120170517014339/config/appsettings/list"
            return (httpMethod.toLowerCase() === armExplorer.HttpVerb[armExplorer.HttpVerb.POST].toLowerCase()) && url.toLowerCase().endsWith("/list");
        };
        ARMUrlParser.prototype.hasResourceType = function () {
            return this.urlParts.length > ARMUrlParts.ResourceType1Name;
        };
        ARMUrlParser.prototype.hasResourceName = function () {
            return this.urlParts.length > ARMUrlParts.ResourceType1Value;
        };
        ARMUrlParser.prototype.getSubscriptionId = function () {
            return this.urlParts[ARMUrlParts.SubscriptionsValue];
        };
        ARMUrlParser.prototype.getResourceGroup = function () {
            return this.urlParts[ARMUrlParts.ResourceGroupsValue];
        };
        ARMUrlParser.prototype.getAPIVersion = function () {
            return this.value.resourceDefinition.apiVersion;
        };
        ARMUrlParser.prototype.getURL = function () {
            return this.value.url;
        };
        ARMUrlParser.prototype.getResourceDefinitionChildren = function () {
            return this.value.resourceDefinition.children;
        };
        ARMUrlParser.prototype.getOriginalURL = function () {
            return this.originalUrl;
        };
        ARMUrlParser.prototype.getHttpMethod = function () {
            return this.value.httpMethod;
        };
        ARMUrlParser.prototype.getActions = function () {
            return this.actions;
        };
        ARMUrlParser.prototype.getResourceActions = function () {
            return this.value.resourceDefinition.actions;
        };
        ARMUrlParser.prototype.hasResourceProvider = function () {
            return this.urlParts.length > ARMUrlParts.ProviderKey;
        };
        ARMUrlParser.prototype.isResourceGroupURL = function () {
            return this.urlParts.length === (ARMUrlParts.ResourceGroupsKey + 1);
        };
        ARMUrlParser.prototype.getResourceIdentifier = function () {
            var resourceIdentifier = {};
            if (!this.hasResourceType()) {
                // We only have resource Id
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
                // check for resource sub types
                for (var i = ARMUrlParts.ResourceType1Value + 1; i < this.urlParts.length; i++) {
                    if (i % 2 === 1) {
                        resourceIdentifier.resourceType += ("/" + this.urlParts[i]);
                    }
                    else {
                        resourceIdentifier.resourceName += ("/" + this.urlParts[i]);
                    }
                }
            }
            return resourceIdentifier;
        };
        return ARMUrlParser;
    }());
    armExplorer.ARMUrlParser = ARMUrlParser;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    var ScriptParametersResolver = /** @class */ (function () {
        function ScriptParametersResolver(urlParser) {
            this.urlParser = urlParser;
            this.supportedCommands = [];
            this.fillSupportedCommands();
        }
        ScriptParametersResolver.prototype.fillSupportedCommands = function () {
            var _this = this;
            var resourceActions = this.urlParser.getResourceActions();
            // add GET related cmdlet
            if (this.urlParser.getHttpMethod().contains(armExplorer.HttpVerb[armExplorer.HttpVerb.GET], true)) {
                this.supportedCommands.push({ cmd: CmdType.Get, isAction: false, isSetAction: false });
            }
            else if (this.urlParser.getHttpMethod().contains(armExplorer.HttpVerb[armExplorer.HttpVerb.POST], true) && this.urlParser.getOriginalURL().contains("list", true)) {
                this.supportedCommands.push({ cmd: CmdType.Invoke, isAction: false, isSetAction: false });
            }
            // add SET related cmdlet
            if (resourceActions.some(function (a) { return (a.toUpperCase() === armExplorer.ResourceActions[armExplorer.ResourceActions.PATCH] || a.toUpperCase() === armExplorer.ResourceActions[armExplorer.ResourceActions.PUT]); })) {
                if (resourceActions.includes(armExplorer.ResourceActions[armExplorer.ResourceActions.GET])) {
                    this.supportedCommands.push({ cmd: CmdType.Set, isAction: false, isSetAction: true });
                }
                else {
                    this.supportedCommands.push({ cmd: CmdType.New, isAction: false, isSetAction: true });
                }
            }
            // add create related cmdlet
            if (resourceActions.includes(armExplorer.ResourceActions[armExplorer.ResourceActions.CREATE])) {
                if (this.urlParser.isResourceGroupURL()) {
                    this.supportedCommands.push({ cmd: CmdType.NewResourceGroup, isAction: false, isSetAction: false });
                }
                else {
                    this.supportedCommands.push({ cmd: CmdType.New, isAction: false, isSetAction: false });
                }
            }
            // add actions
            if (this.urlParser.getActions().length > 0) {
                this.urlParser.getActions().forEach(function (action) {
                    if (action.httpMethod.toUpperCase() === armExplorer.HttpVerb[armExplorer.HttpVerb.DELETE]) {
                        _this.supportedCommands.push({ cmd: CmdType.RemoveAction, isAction: true, isSetAction: false });
                    }
                    else if (action.httpMethod.toUpperCase() === armExplorer.HttpVerb[armExplorer.HttpVerb.POST]) {
                        _this.supportedCommands.push({ cmd: CmdType.InvokeAction, isAction: true, isSetAction: false });
                    }
                });
            }
        };
        ScriptParametersResolver.prototype.getResourceGroup = function () {
            return this.urlParser.getResourceGroup();
        };
        ScriptParametersResolver.prototype.getSubscriptionId = function () {
            return this.urlParser.getSubscriptionId();
        };
        ScriptParametersResolver.prototype.getCompleteResourceId = function () {
            return this.urlParser.getOriginalURL().substring(this.urlParser.getOriginalURL().indexOf("/subscriptions"));
        };
        ScriptParametersResolver.prototype.getSupportedCommands = function () {
            return this.supportedCommands;
        };
        ScriptParametersResolver.prototype.doGetActionName = function (url) {
            return url.substr(url.lastIndexOf("/") + 1, url.length - url.lastIndexOf("/") - 1);
        };
        ScriptParametersResolver.prototype.getActionName = function () {
            return this.doGetActionName(this.urlParser.getURL());
        };
        ScriptParametersResolver.prototype.getActionParameters = function (actionIndex) {
            return this.urlParser.getActions()[actionIndex];
        };
        ScriptParametersResolver.prototype.getActionNameFromAction = function (actionIndex) {
            return this.doGetActionName(this.getActionParameters(actionIndex).url);
        };
        ScriptParametersResolver.prototype.getActionNameFromList = function () {
            return this.doGetActionName(this.urlParser.getURL().replace("/list", ""));
        };
        ScriptParametersResolver.prototype.getResourceName = function () {
            return this.urlParser.getURL().substr(this.urlParser.getURL().lastIndexOf("/") + 1, this.urlParser.getURL().length - this.urlParser.getURL().lastIndexOf("/") - 2);
        };
        // Applicable only for Get-AzureRmResource
        ScriptParametersResolver.prototype.supportsCollection = function (resourceName) {
            // -IsCollection will force Get-AzureRmResource to query RP instead of the cache. 
            // But when ResourceName is available Get-AzureRmResource will always hit RP so skip -IsCollection flag.
            // children are either an array or a string
            // if array
            //      Predefined list of options. Like Providers or (config, appsettings, etc)
            // else if string
            //      this means it's a Url that we need to go fetch and display.
            return !!(!resourceName && (typeof this.urlParser.getResourceDefinitionChildren() === "string")) && this.urlParser.hasResourceProvider();
        };
        ScriptParametersResolver.prototype.getParameters = function () {
            var cmd = {};
            cmd.apiVersion = this.urlParser.getAPIVersion();
            cmd.resourceIdentifier = this.urlParser.getResourceIdentifier();
            cmd.isCollection = this.supportsCollection(cmd.resourceIdentifier.resourceName);
            return cmd;
        };
        return ScriptParametersResolver;
    }());
    armExplorer.ScriptParametersResolver = ScriptParametersResolver;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    var ScriptInternals = /** @class */ (function () {
        function ScriptInternals() {
        }
        ScriptInternals.init = function () {
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
        };
        ScriptInternals.getClassName = function (resType) {
            return this.classNameMap.find(function (item) { return item[0] === resType; })[1];
        };
        ScriptInternals.getCliResourceType = function (cmdType) {
            return this.psToCliActionMap.find(function (item) { return item[0] === cmdType; })[1];
        };
        ScriptInternals.classNameMap = [];
        ScriptInternals.psToCliActionMap = [];
        ScriptInternals.initialized = false;
        return ScriptInternals;
    }());
    armExplorer.ScriptInternals = ScriptInternals;
    function getAzureCliScriptsForResource(value) {
        var parser = new armExplorer.ARMUrlParser(value, []);
        var resolver = new armExplorer.ScriptParametersResolver(parser);
        var resourceHandlerResolver = new armExplorer.ResourceHandlerResolver(resolver);
        var scriptGenerator = new armExplorer.CliScriptGenerator(resolver, resourceHandlerResolver);
        return scriptGenerator.getScript();
    }
    armExplorer.getAzureCliScriptsForResource = getAzureCliScriptsForResource;
    function getPowerShellScriptsForResource(value, actions) {
        var script = "# PowerShell equivalent script\n\n";
        var urlParser = new armExplorer.ARMUrlParser(value, actions);
        var parameterResolver = new armExplorer.ScriptParametersResolver(urlParser);
        var scriptGenerator = new armExplorer.PowerShellScriptGenerator(parameterResolver);
        for (var _i = 0, _a = parameterResolver.getSupportedCommands(); _i < _a.length; _i++) {
            var cmd = _a[_i];
            script += scriptGenerator.getScript(cmd);
        }
        return script;
    }
    armExplorer.getPowerShellScriptsForResource = getPowerShellScriptsForResource;
    function getAnsibleScriptsForResource(value, actions, resourceDefinition) {
        var script = "# Ansible Playbooks\n\n";
        var urlParser = new armExplorer.ARMUrlParser(value, actions);
        var parameterResolver = new armExplorer.ScriptParametersResolver(urlParser);
        var scriptGenerator = new armExplorer.AnsibleScriptGenerator(parameterResolver, resourceDefinition);
        for (var _i = 0, _a = parameterResolver.getSupportedCommands(); _i < _a.length; _i++) {
            var cmd = _a[_i];
            script += scriptGenerator.getScript(cmd);
        }
        return script;
    }
    armExplorer.getAnsibleScriptsForResource = getAnsibleScriptsForResource;
})(armExplorer || (armExplorer = {}));
// converts an array of string pairs into dictionary
function strEnum(strings) {
    return strings.reduce(function (res, key) {
        res[key[0]] = key[1];
        return res;
    }, Object.create(null));
}
var CmdType = strEnum([
    ["Get", "Get-AzureRmResource"],
    ["Invoke", "Invoke-AzureRmResourceAction"],
    ["InvokeAction", "Invoke-AzureRmResourceAction"],
    ["Set", "Set-AzureRmResource"],
    ["New", "New-AzureRmResource"],
    ["RemoveAction", "Remove-AzureRmResource"],
    ["NewResourceGroup", "New-AzureRmResourceGroup"]
]);
(function (armExplorer) {
    var CliResourceType;
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
    var ResourceIdentifierType;
    (function (ResourceIdentifierType) {
        ResourceIdentifierType[ResourceIdentifierType["WithIDOnly"] = 0] = "WithIDOnly";
        ResourceIdentifierType[ResourceIdentifierType["WithGroupType"] = 1] = "WithGroupType";
        ResourceIdentifierType[ResourceIdentifierType["WithGroupTypeName"] = 2] = "WithGroupTypeName";
    })(ResourceIdentifierType = armExplorer.ResourceIdentifierType || (armExplorer.ResourceIdentifierType = {}));
    var ResourceAction;
    (function (ResourceAction) {
        ResourceAction[ResourceAction["Get"] = 0] = "Get";
        ResourceAction[ResourceAction["Invoke"] = 1] = "Invoke";
        ResourceAction[ResourceAction["InvokeAction"] = 2] = "InvokeAction";
        ResourceAction[ResourceAction["Set"] = 3] = "Set";
        ResourceAction[ResourceAction["New"] = 4] = "New";
        ResourceAction[ResourceAction["RemoveAction"] = 5] = "RemoveAction";
        ResourceAction[ResourceAction["NewResourceGroup"] = 6] = "NewResourceGroup";
    })(ResourceAction = armExplorer.ResourceAction || (armExplorer.ResourceAction = {}));
    var ResourceActions;
    (function (ResourceActions) {
        ResourceActions[ResourceActions["PATCH"] = 0] = "PATCH";
        ResourceActions[ResourceActions["PUT"] = 1] = "PUT";
        ResourceActions[ResourceActions["GET"] = 2] = "GET";
        ResourceActions[ResourceActions["CREATE"] = 3] = "CREATE";
    })(ResourceActions = armExplorer.ResourceActions || (armExplorer.ResourceActions = {}));
    var HttpVerb;
    (function (HttpVerb) {
        HttpVerb[HttpVerb["GET"] = 0] = "GET";
        HttpVerb[HttpVerb["POST"] = 1] = "POST";
        HttpVerb[HttpVerb["DELETE"] = 2] = "DELETE";
    })(HttpVerb = armExplorer.HttpVerb || (armExplorer.HttpVerb = {}));
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    var AnsibleScriptGenerator = /** @class */ (function () {
        function AnsibleScriptGenerator(resolver, resourceDefinition) {
            this.resolver = resolver;
            this.script = "";
            this.actionsIndex = 0;
            this.resourceDefinition = {};
            this.resourceDefinition = resourceDefinition;
        }
        AnsibleScriptGenerator.prototype.getScript = function (cmdActionPair) {
            var cmdParameters = this.resolver.getParameters();
            var currentScript = "";
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
                    // append actual structure of request body
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
                    // append actual structure of request body
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
                        // append actual structure of request body
                        var body = this.resolver.getActionParameters(this.actionsIndex).requestBody;
                        if (body) {
                            currentScript += "        body:\n";
                            // parse, as body is apparently returned as JSON string, not an object
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
        };
        AnsibleScriptGenerator.prototype.yamlFromObject = function (o, prefix) {
            var yaml = "";
            var __this = this;
            for (var key in o) {
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
        };
        AnsibleScriptGenerator.prototype.yamlFromResourceId = function (cmdActionPair, prefix) {
            var yaml = "";
            var cmdParameters = this.resolver.getParameters();
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
                    var split_name = cmdParameters.resourceIdentifier.resourceName.split('/');
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
        };
        return AnsibleScriptGenerator;
    }());
    armExplorer.AnsibleScriptGenerator = AnsibleScriptGenerator;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    var CliScriptGenerator = /** @class */ (function () {
        function CliScriptGenerator(resolver, resourceHandlerResolver) {
            this.resolver = resolver;
            this.resourceHandlerResolver = resourceHandlerResolver;
            // Invoke the static constructor to do a one time init
            armExplorer.ScriptInternals.init();
        }
        CliScriptGenerator.prototype.getCliResourceType = function () {
            var resourceId = this.resolver.getCompleteResourceId().toLowerCase();
            if (resourceId.endsWith("/subscriptions")) {
                return armExplorer.CliResourceType.Subscriptions;
            }
            if (resourceId.endsWith("/locations")) {
                return armExplorer.CliResourceType.SubscriptionLocations;
            }
            if (resourceId.endsWith("/resourcegroups")) {
                return armExplorer.CliResourceType.ResourceGroups;
            }
            var resourceIdParts = resourceId.split("/");
            if (resourceIdParts.length === 3) {
                return armExplorer.CliResourceType.Subscription;
            }
            if (resourceIdParts[resourceIdParts.length - 2] === "resourcegroups") {
                return armExplorer.CliResourceType.ResourceGroup;
            }
            if (resourceId.endsWith("/microsoft.web/sites")) {
                return armExplorer.CliResourceType.WebApps;
            }
            var lastIndex = resourceId.lastIndexOf("/");
            if (resourceId.substring(0, lastIndex).endsWith("/microsoft.web/sites")) {
                return armExplorer.CliResourceType.WebApp;
            }
            return armExplorer.CliResourceType.GenericResource;
        };
        CliScriptGenerator.prototype.getScript = function () {
            var resourceType = this.getCliResourceType();
            var resourceHandler = this.resourceHandlerResolver.getResourceHandler(resourceType);
            var script = "";
            for (var _i = 0, _a = this.resolver.getSupportedCommands(); _i < _a.length; _i++) {
                var cmd = _a[_i];
                script += resourceHandler.getScript(armExplorer.ScriptInternals.getCliResourceType(cmd.cmd));
            }
            return script;
        };
        return CliScriptGenerator;
    }());
    armExplorer.CliScriptGenerator = CliScriptGenerator;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    var ResourceHandlerResolver = /** @class */ (function () {
        function ResourceHandlerResolver(resolver) {
            this.resolver = resolver;
            armExplorer.ScriptInternals.init();
        }
        ResourceHandlerResolver.prototype.getResourceHandler = function (resType) {
            var resourceClassName = armExplorer.ScriptInternals.getClassName(resType);
            return new window["armExplorer"][resourceClassName](this.resolver);
        };
        return ResourceHandlerResolver;
    }());
    armExplorer.ResourceHandlerResolver = ResourceHandlerResolver;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    var GenericResource = /** @class */ (function () {
        function GenericResource(resolver) {
            this.resolver = resolver;
        }
        GenericResource.prototype.getScript = function (action) {
            switch (action) {
                case armExplorer.ResourceAction.Get:
                    return "az resource show --id " + this.resolver.getCompleteResourceId() + " --api-version " + this.resolver.getParameters().apiVersion + "\n\n";
                case armExplorer.ResourceAction.Invoke:
                    return "";
                case armExplorer.ResourceAction.InvokeAction:
                    return "";
                case armExplorer.ResourceAction.Set:
                    return "az resource update --id " + this.resolver.getCompleteResourceId() + " --api-version " + this.resolver.getParameters().apiVersion + " --set properties.key=value\n\n";
                case armExplorer.ResourceAction.New:
                case armExplorer.ResourceAction.NewResourceGroup:
                    return "az resource create --id " + this.resolver.getCompleteResourceId() + " --api-version " + this.resolver.getParameters().apiVersion + " --properties {}\n\n";
                case armExplorer.ResourceAction.RemoveAction:
                    return "az resource delete --id " + this.resolver.getCompleteResourceId() + " --api-version " + this.resolver.getParameters().apiVersion + "\n\n";
                default:
                    return "";
            }
        };
        return GenericResource;
    }());
    armExplorer.GenericResource = GenericResource;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    var ResourceGroup = /** @class */ (function (_super) {
        __extends(ResourceGroup, _super);
        function ResourceGroup(resolver) {
            return _super.call(this, resolver) || this;
        }
        ResourceGroup.prototype.getScript = function (action) {
            var script = "";
            switch (action) {
                case armExplorer.ResourceAction.Get:
                    script = "az group show --name \"" + this.resolver.getResourceGroup() + "\"\n\n";
                    break;
                case armExplorer.ResourceAction.NewResourceGroup:
                    script = "az group create --location westus --name NewResourceGroupName\n\n";
                    break;
                case armExplorer.ResourceAction.Invoke:
                    break;
                case armExplorer.ResourceAction.InvokeAction:
                    break;
                case armExplorer.ResourceAction.Set:
                    script = "az group update --name \"" + this.resolver.getResourceGroup() + "\" <properties>\n\n";
                    break;
                case armExplorer.ResourceAction.New:
                    break;
                case armExplorer.ResourceAction.RemoveAction:
                    script = "az group delete --name \"" + this.resolver.getResourceGroup() + "\"\n\n";
                    break;
                default:
                    break;
            }
            return script === "" ? _super.prototype.getScript.call(this, action) : script;
        };
        return ResourceGroup;
    }(armExplorer.GenericResource));
    armExplorer.ResourceGroup = ResourceGroup;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    var ResourceGroups = /** @class */ (function (_super) {
        __extends(ResourceGroups, _super);
        function ResourceGroups(resolver) {
            return _super.call(this, resolver) || this;
        }
        ResourceGroups.prototype.getScript = function (action) {
            var script = "";
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
            return script === "" ? _super.prototype.getScript.call(this, action) : script;
        };
        return ResourceGroups;
    }(armExplorer.GenericResource));
    armExplorer.ResourceGroups = ResourceGroups;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    var Subscription = /** @class */ (function (_super) {
        __extends(Subscription, _super);
        function Subscription(resolver) {
            return _super.call(this, resolver) || this;
        }
        Subscription.prototype.getScript = function (action) {
            var script = "";
            switch (action) {
                case armExplorer.ResourceAction.Get:
                    script = "az account show --subscription " + this.resolver.getSubscriptionId() + "\n\n";
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
            return script === "" ? _super.prototype.getScript.call(this, action) : script;
        };
        return Subscription;
    }(armExplorer.GenericResource));
    armExplorer.Subscription = Subscription;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    var SubscriptionLocations = /** @class */ (function (_super) {
        __extends(SubscriptionLocations, _super);
        function SubscriptionLocations(resolver) {
            return _super.call(this, resolver) || this;
        }
        SubscriptionLocations.prototype.getScript = function (action) {
            var script = "";
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
            return script === "" ? _super.prototype.getScript.call(this, action) : script;
        };
        return SubscriptionLocations;
    }(armExplorer.GenericResource));
    armExplorer.SubscriptionLocations = SubscriptionLocations;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    var Subscriptions = /** @class */ (function (_super) {
        __extends(Subscriptions, _super);
        function Subscriptions(resolver) {
            return _super.call(this, resolver) || this;
        }
        Subscriptions.prototype.getScript = function (action) {
            var script = "";
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
            return script === "" ? _super.prototype.getScript.call(this, action) : script;
        };
        return Subscriptions;
    }(armExplorer.GenericResource));
    armExplorer.Subscriptions = Subscriptions;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    var WebApp = /** @class */ (function (_super) {
        __extends(WebApp, _super);
        function WebApp(resolver) {
            return _super.call(this, resolver) || this;
        }
        WebApp.prototype.getScript = function (action) {
            var script = "";
            switch (action) {
                case armExplorer.ResourceAction.Get:
                    script = "az webapp show --name \"" + this.resolver.getParameters().resourceIdentifier.resourceName + "\" --resource-group \"" + this.resolver.getResourceGroup() + "\"\n\n";
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
                    script = "az webapp create --resource-group \"" + this.resolver.getResourceGroup() + "\" --plan planName --name NewWebAppName\n\n";
                    break;
                case armExplorer.ResourceAction.RemoveAction:
                    script = "az webapp delete --name \"" + this.resolver.getParameters().resourceIdentifier.resourceName + "\" --resource-group \"" + this.resolver.getResourceGroup() + "\"\n\n";
                    break;
                default:
                    break;
            }
            return script === "" ? _super.prototype.getScript.call(this, action) : script;
        };
        return WebApp;
    }(armExplorer.GenericResource));
    armExplorer.WebApp = WebApp;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    var WebApps = /** @class */ (function (_super) {
        __extends(WebApps, _super);
        function WebApps(resolver) {
            return _super.call(this, resolver) || this;
        }
        WebApps.prototype.getScript = function (action) {
            var script = "";
            switch (action) {
                case armExplorer.ResourceAction.Get:
                    script = "az webapp list --resource-group \"" + this.resolver.getResourceGroup() + "\"\n\n";
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
                    script = "az webapp create --resource-group \"" + this.resolver.getResourceGroup() + "\" --plan planName --name NewWebAppName\n\n";
                    break;
                case armExplorer.ResourceAction.RemoveAction:
                    break;
                default:
                    break;
            }
            return script === "" ? _super.prototype.getScript.call(this, action) : script;
        };
        return WebApps;
    }(armExplorer.GenericResource));
    armExplorer.WebApps = WebApps;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    var PowerShellScriptGenerator = /** @class */ (function () {
        function PowerShellScriptGenerator(resolver) {
            this.resolver = resolver;
            this.script = "";
            this.actionsIndex = 0;
        }
        PowerShellScriptGenerator.prototype.getPrefix = function (commandInfo) {
            var prefixString = "";
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
                    prefixString = "# DELETE " + this.resolver.getActionNameFromAction(this.actionsIndex) + "\n";
                    break;
                }
                case CmdType.Set: {
                    prefixString = "# SET " + this.resolver.getActionNameFromList() + "\n$PropertiesObject = @{\n\t#Property = value;\n}\n";
                    break;
                }
                case CmdType.Invoke:
                case CmdType.InvokeAction: {
                    if (commandInfo.isAction) {
                        var currentAction = this.resolver.getActionParameters(this.actionsIndex);
                        var parametersObject = currentAction.requestBody ? ("$ParametersObject = " + ObjectUtils.getPsObjectFromJson(currentAction.requestBody, 0) + "\n") : '';
                        prefixString = "# Action " + this.resolver.getActionNameFromAction(this.actionsIndex) + "\n" + parametersObject;
                    }
                    else {
                        prefixString = "# LIST " + this.resolver.getActionNameFromList() + "\n";
                    }
                    break;
                }
                case CmdType.New: {
                    if (commandInfo.isSetAction) {
                        prefixString = "# SET " + this.resolver.getActionName() + "\n$PropertiesObject = @{\n\t#Property = value;\n}\n";
                    }
                    else {
                        var newName = "New" + this.resolver.getResourceName();
                        prefixString = "# CREATE " + this.resolver.getActionName() + "\n$ResourceLocation = \"West US\"\n$ResourceName = \"" + newName + "\"\n$PropertiesObject = @{\n\t#Property = value;\n}\n";
                    }
                    break;
                }
            }
            return prefixString;
        };
        PowerShellScriptGenerator.prototype.getScript = function (cmdActionPair) {
            var cmdParameters = this.resolver.getParameters();
            var currentScript = "";
            var scriptPrefix = this.getPrefix(cmdActionPair);
            switch (cmdActionPair.cmd) {
                case CmdType.Get: {
                    switch (cmdParameters.resourceIdentifier.resourceIdentifierType) {
                        case armExplorer.ResourceIdentifierType.WithIDOnly: {
                            if (cmdParameters.isCollection) {
                                currentScript = cmdActionPair.cmd + " -ResourceId " + cmdParameters.resourceIdentifier.resourceId + " -IsCollection -ApiVersion " + cmdParameters.apiVersion;
                            }
                            else {
                                currentScript = cmdActionPair.cmd + " -ResourceId " + cmdParameters.resourceIdentifier.resourceId + " -ApiVersion " + cmdParameters.apiVersion;
                            }
                            break;
                        }
                        case armExplorer.ResourceIdentifierType.WithGroupType: {
                            if (cmdParameters.isCollection) {
                                currentScript = cmdActionPair.cmd + " -ResourceGroupName " + cmdParameters.resourceIdentifier.resourceGroup + " -ResourceType " + cmdParameters.resourceIdentifier.resourceType + " -IsCollection -ApiVersion " + cmdParameters.apiVersion;
                            }
                            else {
                                currentScript = cmdActionPair.cmd + " -ResourceGroupName " + cmdParameters.resourceIdentifier.resourceGroup + " -ResourceType " + cmdParameters.resourceIdentifier.resourceType + " -ApiVersion " + cmdParameters.apiVersion;
                            }
                            break;
                        }
                        case armExplorer.ResourceIdentifierType.WithGroupTypeName: {
                            if (cmdParameters.isCollection) {
                                currentScript = cmdActionPair.cmd + " -ResourceGroupName " + cmdParameters.resourceIdentifier.resourceGroup + " -ResourceType " + cmdParameters.resourceIdentifier.resourceType + " -ResourceName \"" + cmdParameters.resourceIdentifier.resourceName + "\" -IsCollection -ApiVersion " + cmdParameters.apiVersion;
                            }
                            else {
                                currentScript = cmdActionPair.cmd + " -ResourceGroupName " + cmdParameters.resourceIdentifier.resourceGroup + " -ResourceType " + cmdParameters.resourceIdentifier.resourceType + " -ResourceName \"" + cmdParameters.resourceIdentifier.resourceName + "\" -ApiVersion " + cmdParameters.apiVersion;
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
                                // don't think is possible. 
                                console.log("Attempt to create resource with pre existing id");
                                break;
                            }
                            case armExplorer.ResourceIdentifierType.WithGroupType: {
                                currentScript = cmdActionPair.cmd + " -PropertyObject $PropertiesObject -ResourceGroupName " + cmdParameters.resourceIdentifier.resourceGroup + " -ResourceType " + cmdParameters.resourceIdentifier.resourceType + " -ApiVersion " + cmdParameters.apiVersion + " -Force";
                                break;
                            }
                            case armExplorer.ResourceIdentifierType.WithGroupTypeName: {
                                currentScript = cmdActionPair.cmd + " -PropertyObject $PropertiesObject -ResourceGroupName " + cmdParameters.resourceIdentifier.resourceGroup + " -ResourceType " + cmdParameters.resourceIdentifier.resourceType + " -ResourceName \"" + cmdParameters.resourceIdentifier.resourceName + "\" -ApiVersion " + cmdParameters.apiVersion + " -Force";
                                break;
                            }
                        }
                    }
                    else {
                        switch (cmdParameters.resourceIdentifier.resourceIdentifierType) {
                            case armExplorer.ResourceIdentifierType.WithIDOnly: {
                                // don't think is possible. 
                                console.log("Attempt to create resource with pre existing id");
                                break;
                            }
                            case armExplorer.ResourceIdentifierType.WithGroupType: {
                                currentScript = cmdActionPair.cmd + " -ResourceName $ResourceName -Location $ResourceLocation -PropertyObject $PropertiesObject -ResourceGroupName " + cmdParameters.resourceIdentifier.resourceGroup + " -ResourceType " + cmdParameters.resourceIdentifier.resourceType + " -ApiVersion " + cmdParameters.apiVersion + " -Force";
                                break;
                            }
                            case armExplorer.ResourceIdentifierType.WithGroupTypeName: {
                                currentScript = cmdActionPair.cmd + " -Location $ResourceLocation -PropertyObject $PropertiesObject -ResourceGroupName " + cmdParameters.resourceIdentifier.resourceGroup + " -ResourceType " + cmdParameters.resourceIdentifier.resourceType + " -ResourceName \"" + cmdParameters.resourceIdentifier.resourceName + "/$ResourceName\" -ApiVersion " + cmdParameters.apiVersion + " -Force";
                                break;
                            }
                        }
                    }
                    break;
                }
                case CmdType.Set: {
                    switch (cmdParameters.resourceIdentifier.resourceIdentifierType) {
                        case armExplorer.ResourceIdentifierType.WithIDOnly: {
                            currentScript = cmdActionPair.cmd + " -PropertyObject $PropertiesObject -ResourceId " + cmdParameters.resourceIdentifier.resourceId + " -ApiVersion " + cmdParameters.apiVersion + " -Force";
                            break;
                        }
                        case armExplorer.ResourceIdentifierType.WithGroupType: {
                            currentScript = cmdActionPair.cmd + " -PropertyObject $PropertiesObject -ResourceGroupName " + cmdParameters.resourceIdentifier.resourceGroup + " -ResourceType " + cmdParameters.resourceIdentifier.resourceType + " -ApiVersion " + cmdParameters.apiVersion + " -Force";
                            break;
                        }
                        case armExplorer.ResourceIdentifierType.WithGroupTypeName: {
                            currentScript = cmdActionPair.cmd + " -PropertyObject $PropertiesObject -ResourceGroupName " + cmdParameters.resourceIdentifier.resourceGroup + " -ResourceType " + cmdParameters.resourceIdentifier.resourceType + " -ResourceName \"" + cmdParameters.resourceIdentifier.resourceName + "\" -ApiVersion " + cmdParameters.apiVersion + " -Force";
                            break;
                        }
                    }
                    break;
                }
                case CmdType.RemoveAction: {
                    switch (cmdParameters.resourceIdentifier.resourceIdentifierType) {
                        case armExplorer.ResourceIdentifierType.WithIDOnly: {
                            currentScript = cmdActionPair.cmd + " -ResourceId " + cmdParameters.resourceIdentifier.resourceId + " -ApiVersion " + cmdParameters.apiVersion + " -Force";
                            break;
                        }
                        case armExplorer.ResourceIdentifierType.WithGroupType: {
                            currentScript = cmdActionPair.cmd + " -ResourceGroupName " + cmdParameters.resourceIdentifier.resourceGroup + " -ResourceType " + cmdParameters.resourceIdentifier.resourceType + " -ApiVersion " + cmdParameters.apiVersion + " -Force";
                            break;
                        }
                        case armExplorer.ResourceIdentifierType.WithGroupTypeName: {
                            currentScript = cmdActionPair.cmd + " -ResourceGroupName " + cmdParameters.resourceIdentifier.resourceGroup + " -ResourceType " + cmdParameters.resourceIdentifier.resourceType + " -ResourceName \"" + cmdParameters.resourceIdentifier.resourceName + "\" -ApiVersion " + cmdParameters.apiVersion + " -Force";
                            break;
                        }
                    }
                    this.actionsIndex++;
                    break;
                }
                case CmdType.Invoke:
                case CmdType.InvokeAction: {
                    if (cmdActionPair.isAction) {
                        var currentAction = this.resolver.getActionParameters(this.actionsIndex++);
                        var parameters = currentAction.requestBody ? "-Parameters $ParametersObject" : "";
                        switch (cmdParameters.resourceIdentifier.resourceIdentifierType) {
                            case armExplorer.ResourceIdentifierType.WithIDOnly: {
                                currentScript = cmdActionPair.cmd + " -ResourceId " + cmdParameters.resourceIdentifier.resourceId + " -Action " + currentAction.name + " " + parameters + " -ApiVersion " + cmdParameters.apiVersion + " -Force";
                                break;
                            }
                            case armExplorer.ResourceIdentifierType.WithGroupType: {
                                currentScript = cmdActionPair.cmd + " -ResourceGroupName " + cmdParameters.resourceIdentifier.resourceGroup + " -ResourceType " + cmdParameters.resourceIdentifier.resourceType + " -Action " + currentAction.name + " " + parameters + " -ApiVersion " + cmdParameters.apiVersion + " -Force";
                                break;
                            }
                            case armExplorer.ResourceIdentifierType.WithGroupTypeName: {
                                currentScript = cmdActionPair.cmd + " -ResourceGroupName " + cmdParameters.resourceIdentifier.resourceGroup + " -ResourceType " + cmdParameters.resourceIdentifier.resourceType + " -ResourceName " + cmdParameters.resourceIdentifier.resourceName + " -Action " + currentAction.name + " " + parameters + " -ApiVersion " + cmdParameters.apiVersion + " -Force";
                                break;
                            }
                        }
                    }
                    else {
                        switch (cmdParameters.resourceIdentifier.resourceIdentifierType) {
                            case armExplorer.ResourceIdentifierType.WithIDOnly: {
                                currentScript = "$resource = " + cmdActionPair.cmd + " -ResourceId " + cmdParameters.resourceIdentifier.resourceId + " -Action list -ApiVersion " + cmdParameters.apiVersion + " -Force\n$resource.Properties";
                                break;
                            }
                            case armExplorer.ResourceIdentifierType.WithGroupType: {
                                currentScript = "$resource = " + cmdActionPair.cmd + " -ResourceGroupName " + cmdParameters.resourceIdentifier.resourceGroup + " -ResourceType " + cmdParameters.resourceIdentifier.resourceType + " -Action list -ApiVersion " + cmdParameters.apiVersion + " -Force\n$resource.Properties";
                                break;
                            }
                            case armExplorer.ResourceIdentifierType.WithGroupTypeName: {
                                currentScript = "$resource = " + cmdActionPair.cmd + " -ResourceGroupName " + cmdParameters.resourceIdentifier.resourceGroup + " -ResourceType " + cmdParameters.resourceIdentifier.resourceType + " -ResourceName \"" + cmdParameters.resourceIdentifier.resourceName + "\" -Action list -ApiVersion " + cmdParameters.apiVersion + " -Force\n$resource.Properties";
                                break;
                            }
                        }
                    }
                    break;
                }
                case CmdType.NewResourceGroup: {
                    currentScript += cmdActionPair.cmd + " -Location $ResourceLocation -Name $ResourceName";
                    break;
                }
            }
            return scriptPrefix + currentScript + "\n\n";
        };
        return PowerShellScriptGenerator;
    }());
    armExplorer.PowerShellScriptGenerator = PowerShellScriptGenerator;
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    var ARMUrlParserTests;
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
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions";
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithIDOnly, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("/subscriptions", resourceIdentifier.resourceId);
            armExplorer.throwIfDefined(resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceGroup);
            armExplorer.throwIfDefined(resourceIdentifier.resourceType);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResouceIDOnlyWithSubId() {
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000";
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithIDOnly, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("/subscriptions/00000000-0000-0000-0000-000000000000", resourceIdentifier.resourceId);
            armExplorer.throwIfDefined(resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceGroup);
            armExplorer.throwIfDefined(resourceIdentifier.resourceType);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResourceIDOnlyWithResourceGroup() {
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups";
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithIDOnly, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups", resourceIdentifier.resourceId);
            armExplorer.throwIfDefined(resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceGroup);
            armExplorer.throwIfDefined(resourceIdentifier.resourceType);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResourceIDOnlyWithResourceGroupName() {
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg";
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithIDOnly, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg", resourceIdentifier.resourceId);
            armExplorer.throwIfDefined(resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceGroup);
            armExplorer.throwIfDefined(resourceIdentifier.resourceType);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResGrpNameResType() {
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames";
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithGroupType, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("cloudsvcrg", resourceIdentifier.resourceGroup);
            armExplorer.throwIfNotEqual("Microsoft.ClassicCompute/domainNames", resourceIdentifier.resourceType);
            armExplorer.throwIfDefined(resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceId);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResGrpNameResTypeResName() {
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc";
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithGroupTypeName, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("cloudsvcrg", resourceIdentifier.resourceGroup);
            armExplorer.throwIfNotEqual("Microsoft.ClassicCompute/domainNames", resourceIdentifier.resourceType);
            armExplorer.throwIfNotEqual("x123cloudsvc", resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceId);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResGrpNameResTypeResNameSubType1() {
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots";
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithGroupTypeName, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("cloudsvcrg", resourceIdentifier.resourceGroup);
            armExplorer.throwIfNotEqual("Microsoft.ClassicCompute/domainNames/slots", resourceIdentifier.resourceType);
            armExplorer.throwIfNotEqual("x123cloudsvc", resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceId);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResGrpNameResTypeResNameSubType1SubName1() {
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production";
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithGroupTypeName, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("cloudsvcrg", resourceIdentifier.resourceGroup);
            armExplorer.throwIfNotEqual("Microsoft.ClassicCompute/domainNames/slots", resourceIdentifier.resourceType);
            armExplorer.throwIfNotEqual("x123cloudsvc/Production", resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceId);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResGrpNameResTypeResNameSubType1SubName1SubType2() {
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles";
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithGroupTypeName, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("cloudsvcrg", resourceIdentifier.resourceGroup);
            armExplorer.throwIfNotEqual("Microsoft.ClassicCompute/domainNames/slots/roles", resourceIdentifier.resourceType);
            armExplorer.throwIfNotEqual("x123cloudsvc/Production", resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceId);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResGrpNameResTypeResNameSubType1SubName1SubType2SubName2() {
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1";
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithGroupTypeName, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("cloudsvcrg", resourceIdentifier.resourceGroup);
            armExplorer.throwIfNotEqual("Microsoft.ClassicCompute/domainNames/slots/roles", resourceIdentifier.resourceType);
            armExplorer.throwIfNotEqual("x123cloudsvc/Production/WorkerRole1", resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceId);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResGrpNameResTypeResNameSubType1SubName1SubType2SubName2SubType3() {
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1/metricDefinitions";
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithGroupTypeName, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("cloudsvcrg", resourceIdentifier.resourceGroup);
            armExplorer.throwIfNotEqual("Microsoft.ClassicCompute/domainNames/slots/roles/metricDefinitions", resourceIdentifier.resourceType);
            armExplorer.throwIfNotEqual("x123cloudsvc/Production/WorkerRole1", resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceId);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResGrpNameResTypeResNameSubType1SubName1SubType2SubName2SubType3SubName3() {
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1/metricDefinitions/Percentage CPU";
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resourceIdentifier = parser.getResourceIdentifier();
            armExplorer.throwIfNotEqual(armExplorer.ResourceIdentifierType.WithGroupTypeName, resourceIdentifier.resourceIdentifierType);
            armExplorer.throwIfNotEqual("cloudsvcrg", resourceIdentifier.resourceGroup);
            armExplorer.throwIfNotEqual("Microsoft.ClassicCompute/domainNames/slots/roles/metricDefinitions", resourceIdentifier.resourceType);
            armExplorer.throwIfNotEqual("x123cloudsvc/Production/WorkerRole1/Percentage CPU", resourceIdentifier.resourceName);
            armExplorer.throwIfDefined(resourceIdentifier.resourceId);
            armExplorer.logSuccess(arguments);
        }
        function parseUrlWithResourceUrlWithList() {
            var value = {};
            value.httpMethod = "POST";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rgrp1/providers/Microsoft.Web/sites/WebApp120170517014339/config/appsettings/list";
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resourceIdentifier = parser.getResourceIdentifier();
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
    var MockResourceHandlerResolver = /** @class */ (function () {
        function MockResourceHandlerResolver(resourceHandler) {
            this.resourceHandler = resourceHandler;
        }
        MockResourceHandlerResolver.prototype.getResourceHandler = function (resType) {
            return this.resourceHandler;
        };
        return MockResourceHandlerResolver;
    }());
    var CliScriptGeneratorTests;
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
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions";
            value.resourceDefinition = resourceDefinition;
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resolver = new armExplorer.ScriptParametersResolver(parser);
            var resourceHandlerResolver = new MockResourceHandlerResolver(new armExplorer.Subscriptions(resolver));
            var scriptor = new armExplorer.CliScriptGenerator(resolver, resourceHandlerResolver);
            armExplorer.throwIfNotEqual(armExplorer.CliResourceType.Subscriptions, scriptor.getCliResourceType());
            var expected = "az account list\n\n";
            armExplorer.throwIfNotEqual(expected, scriptor.getScript());
            armExplorer.logSuccess(arguments);
        }
        function scriptSubscription() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000";
            value.resourceDefinition = resourceDefinition;
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resolver = new armExplorer.ScriptParametersResolver(parser);
            var resourceHandlerResolver = new MockResourceHandlerResolver(new armExplorer.Subscription(resolver));
            var scriptor = new armExplorer.CliScriptGenerator(resolver, resourceHandlerResolver);
            armExplorer.throwIfNotEqual(armExplorer.CliResourceType.Subscription, scriptor.getCliResourceType());
            var expected = "az account show --subscription 00000000-0000-0000-0000-000000000000\n\n";
            armExplorer.throwIfNotEqual(expected, scriptor.getScript());
            armExplorer.logSuccess(arguments);
        }
        function scriptResourceGroups() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups";
            value.resourceDefinition = resourceDefinition;
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resolver = new armExplorer.ScriptParametersResolver(parser);
            var resourceHandlerResolver = new MockResourceHandlerResolver(new armExplorer.ResourceGroups(resolver));
            var scriptor = new armExplorer.CliScriptGenerator(resolver, resourceHandlerResolver);
            armExplorer.throwIfNotEqual(armExplorer.CliResourceType.ResourceGroups, scriptor.getCliResourceType());
            var expectedScriptGet = "az group list\n\n";
            var expectedScriptNew = "az group create --location westus --name NewResourceGroupName\n\n";
            armExplorer.throwIfNotEqual(expectedScriptGet + expectedScriptNew, scriptor.getScript());
            armExplorer.logSuccess(arguments);
        }
        function scriptResourceGroup() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "PUT", "DELETE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = ["exportTemplate", "moveResources", "providers", "validateMoveResources"];
            var actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/6e6e25b…-43f4-bdde-1864842e524b/resourceGroups/cloudsvcrg", query: undefined, requestBody: undefined };
            actions[1] = { httpMethod: "POST", name: "exportTemplate", url: "https://management.azure.com/subscriptions/6e6e25b…842e524b/resourceGroups/cloudsvcrg/exportTemplate", query: undefined, requestBody: '{"options": "IncludeParameterDefaultValue, IncludeComments", "resources": ["* "]}' };
            actions[2] = { httpMethod: "POST", name: "moveResources", url: "https://management.azure.com/subscriptions/6e6e25b…842e524b/resourceGroups/cloudsvcrg/moveResources", query: undefined, requestBody: '{"targetResourceGroup": "(string)","resources": ["(string)"]}' };
            actions[3] = { httpMethod: "POST", name: "validateMoveResources", url: "https://management.azure.com/subscriptions/6e6e25b…842e524b/resourceGroups/cloudsvcrg/validateMoveResources", query: undefined, requestBody: '{"targetResourceGroup": "(string)","resources": ["(string)"]}' };
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg";
            value.resourceDefinition = resourceDefinition;
            var parser = new armExplorer.ARMUrlParser(value, actions);
            var resolver = new armExplorer.ScriptParametersResolver(parser);
            var resourceHandlerResolver = new MockResourceHandlerResolver(new armExplorer.ResourceGroup(resolver));
            var scriptor = new armExplorer.CliScriptGenerator(resolver, resourceHandlerResolver);
            armExplorer.throwIfNotEqual(armExplorer.CliResourceType.ResourceGroup, scriptor.getCliResourceType());
            var expectedScriptGet = 'az group show --name "cloudsvcrg"\n\n';
            var expectedScriptSet = 'az group update --name "cloudsvcrg" <properties>\n\n';
            var expectedScriptRemove = 'az group delete --name "cloudsvcrg"\n\n';
            armExplorer.throwIfNotEqual(expectedScriptGet + expectedScriptSet + expectedScriptRemove, scriptor.getScript());
            armExplorer.logSuccess(arguments);
        }
        function scriptWebApps() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2014-03-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/6e6e25b9-3ade-43f4-bdde-1864842e524b/resourceGroups/rgrp1/providers/Microsoft.Web/sites";
            value.resourceDefinition = resourceDefinition;
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resolver = new armExplorer.ScriptParametersResolver(parser);
            var resourceHandlerResolver = new MockResourceHandlerResolver(new armExplorer.WebApps(resolver));
            var scriptor = new armExplorer.CliScriptGenerator(resolver, resourceHandlerResolver);
            armExplorer.throwIfNotEqual(armExplorer.CliResourceType.WebApps, scriptor.getCliResourceType());
            var expectedScriptGet = 'az webapp list --resource-group "rgrp1"\n\n';
            var expectedScriptNew = 'az webapp create --resource-group "rgrp1" --plan planName --name NewWebAppName\n\n';
            armExplorer.throwIfNotEqual(expectedScriptGet + expectedScriptNew, scriptor.getScript());
            armExplorer.logSuccess(arguments);
        }
        function scriptWebApp() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "DELETE", "PUT", "CREATE"];
            resourceDefinition.apiVersion = "2016-03-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/6e6e25b9-3ade-43f4-bdde-1864842e524b/resourceGroups/rgrp1/providers/Microsoft.Web/sites/xdfxdfxdfxdf";
            value.resourceDefinition = resourceDefinition;
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resolver = new armExplorer.ScriptParametersResolver(parser);
            var resourceHandlerResolver = new MockResourceHandlerResolver(new armExplorer.WebApp(resolver));
            var scriptor = new armExplorer.CliScriptGenerator(resolver, resourceHandlerResolver);
            armExplorer.throwIfNotEqual(armExplorer.CliResourceType.WebApp, scriptor.getCliResourceType());
            var expectedScriptGet = 'az webapp show --name "xdfxdfxdfxdf" --resource-group "rgrp1"\n\n';
            var expectedScriptSet = 'az resource update --id /subscriptions/6e6e25b9-3ade-43f4-bdde-1864842e524b/resourceGroups/rgrp1/providers/Microsoft.Web/sites/xdfxdfxdfxdf --api-version 2016-03-01 --set properties.key=value\n\n';
            var expectedScriptNew = 'az webapp create --resource-group "rgrp1" --plan planName --name NewWebAppName\n\n';
            armExplorer.throwIfNotEqual(expectedScriptGet + expectedScriptSet + expectedScriptNew, scriptor.getScript());
            armExplorer.logSuccess(arguments);
        }
        function scriptGenericResource() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "PUT", "DELETE"];
            resourceDefinition.apiVersion = "2016-04-01";
            resourceDefinition.children = ["slots"];
            var actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc", query: undefined, requestBody: undefined };
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            var resourceHandlerResolver = new MockResourceHandlerResolver(new armExplorer.GenericResource(resolver));
            var scriptor = new armExplorer.CliScriptGenerator(resolver, resourceHandlerResolver);
            armExplorer.throwIfNotEqual(armExplorer.CliResourceType.GenericResource, scriptor.getCliResourceType());
            var expectedScriptGet = 'az resource show --id /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc --api-version 2016-04-01\n\n';
            var expectedScriptSet = 'az resource update --id /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc --api-version 2016-04-01 --set properties.key=value\n\n';
            var expectedScriptDelete = 'az resource delete --id /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc --api-version 2016-04-01\n\n';
            armExplorer.throwIfNotEqual(expectedScriptGet + expectedScriptSet + expectedScriptDelete, scriptor.getScript());
            armExplorer.logSuccess(arguments);
        }
        function scriptSubscriptionLocations() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET"];
            resourceDefinition.apiVersion = "2014-04-01";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/locations";
            value.resourceDefinition = resourceDefinition;
            var parser = new armExplorer.ARMUrlParser(value, []);
            var resolver = new armExplorer.ScriptParametersResolver(parser);
            var resourceHandlerResolver = new MockResourceHandlerResolver(new armExplorer.SubscriptionLocations(resolver));
            var scriptor = new armExplorer.CliScriptGenerator(resolver, resourceHandlerResolver);
            armExplorer.throwIfNotEqual(armExplorer.CliResourceType.SubscriptionLocations, scriptor.getCliResourceType());
            var expectedScript = "az account list-locations\n\n";
            armExplorer.throwIfNotEqual(expectedScript, scriptor.getScript());
            armExplorer.logSuccess(arguments);
        }
    })(CliScriptGeneratorTests || (CliScriptGeneratorTests = {}));
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    var PsScriptGeneratorTests;
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
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            var scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedScripts = [];
            expectedScripts[0] = "# GET subscriptions\nGet-AzureRmResource -ResourceId /subscriptions -ApiVersion 2014-04-01\n\n";
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            var expectedScriptIndex = 0;
            for (var _i = 0, actualSupportedCommands_1 = actualSupportedCommands; _i < actualSupportedCommands_1.length; _i++) {
                var cmdActionPair = actualSupportedCommands_1[_i];
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptSubscriptionsSubId() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            var scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedScripts = [];
            expectedScripts[0] = "# GET 00000000-0000-0000-0000-000000000000\nGet-AzureRmResource -ResourceId /subscriptions/00000000-0000-0000-0000-000000000000 -ApiVersion 2014-04-01\n\n";
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            var expectedScriptIndex = 0;
            for (var _i = 0, actualSupportedCommands_2 = actualSupportedCommands; _i < actualSupportedCommands_2.length; _i++) {
                var cmdActionPair = actualSupportedCommands_2[_i];
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptSubscriptionsSubIdResGroup() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            var scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedScripts = [];
            expectedScripts[0] = "# GET resourceGroups\nGet-AzureRmResource -ResourceId /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups -ApiVersion 2014-04-01\n\n";
            expectedScripts[1] = '# CREATE resourceGroups\n$ResourceLocation = "West US"\n$ResourceName = "NewresourceGroup"\n\nNew-AzureRmResourceGroup -Location $ResourceLocation -Name $ResourceName\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            var expectedScriptIndex = 0;
            for (var _i = 0, actualSupportedCommands_3 = actualSupportedCommands; _i < actualSupportedCommands_3.length; _i++) {
                var cmdActionPair = actualSupportedCommands_3[_i];
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResourceIDOnlyWithResourceGroupName() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "PUT", "DELETE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = ["exportTemplate", "moveResources", "providers", "validateMoveResources"];
            var actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/6e6e25b…-43f4-bdde-1864842e524b/resourceGroups/cloudsvcrg", query: undefined, requestBody: undefined };
            actions[1] = { httpMethod: "POST", name: "exportTemplate", url: "https://management.azure.com/subscriptions/6e6e25b…842e524b/resourceGroups/cloudsvcrg/exportTemplate", query: undefined, requestBody: '{"options": "IncludeParameterDefaultValue, IncludeComments", "resources": ["* "]}' };
            actions[2] = { httpMethod: "POST", name: "moveResources", url: "https://management.azure.com/subscriptions/6e6e25b…842e524b/resourceGroups/cloudsvcrg/moveResources", query: undefined, requestBody: '{"targetResourceGroup": "(string)","resources": ["(string)"]}' };
            actions[3] = { httpMethod: "POST", name: "validateMoveResources", url: "https://management.azure.com/subscriptions/6e6e25b…842e524b/resourceGroups/cloudsvcrg/validateMoveResources", query: undefined, requestBody: '{"targetResourceGroup": "(string)","resources": ["(string)"]}' };
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            var scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedScripts = [];
            expectedScripts[0] = "# GET cloudsvcrg\nGet-AzureRmResource -ResourceId /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg -ApiVersion 2014-04-01\n\n";
            expectedScripts[1] = '# SET cloudsvcrg\n$PropertiesObject = @{\n\t#Property = value;\n}\nSet-AzureRmResource -PropertyObject $PropertiesObject -ResourceId /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg -ApiVersion 2014-04-01 -Force\n\n';
            expectedScripts[2] = '# DELETE cloudsvcrg\nRemove-AzureRmResource -ResourceId /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg -ApiVersion 2014-04-01 -Force\n\n';
            expectedScripts[3] = '# Action exportTemplate\n$ParametersObject = @{\n\toptions = "IncludeParameterDefaultValue, IncludeComments"\n\tresources = (\n\t\t"* "\n\t)\n}\n\nInvoke-AzureRmResourceAction -ResourceId /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg -Action exportTemplate -Parameters $ParametersObject -ApiVersion 2014-04-01 -Force\n\n';
            expectedScripts[4] = '# Action moveResources\n$ParametersObject = @{\n\ttargetResourceGroup = "(string)"\n\tresources = (\n\t\t"(string)"\n\t)\n}\n\nInvoke-AzureRmResourceAction -ResourceId /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg -Action moveResources -Parameters $ParametersObject -ApiVersion 2014-04-01 -Force\n\n';
            expectedScripts[5] = '# Action validateMoveResources\n$ParametersObject = @{\n\ttargetResourceGroup = "(string)"\n\tresources = (\n\t\t"(string)"\n\t)\n}\n\nInvoke-AzureRmResourceAction -ResourceId /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg -Action validateMoveResources -Parameters $ParametersObject -ApiVersion 2014-04-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            var expectedScriptIndex = 0;
            for (var _i = 0, actualSupportedCommands_4 = actualSupportedCommands; _i < actualSupportedCommands_4.length; _i++) {
                var cmdActionPair = actualSupportedCommands_4[_i];
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResGrpNameResType() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2016-04-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            var scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedScripts = [];
            expectedScripts[0] = "# GET domainNames\nGet-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames -IsCollection -ApiVersion 2016-04-01\n\n";
            expectedScripts[1] = '# CREATE domainNames\n$ResourceLocation = "West US"\n$ResourceName = "NewdomainName"\n$PropertiesObject = @{\n\t#Property = value;\n}\nNew-AzureRmResource -ResourceName $ResourceName -Location $ResourceLocation -PropertyObject $PropertiesObject -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames -ApiVersion 2016-04-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            var expectedScriptIndex = 0;
            for (var _i = 0, actualSupportedCommands_5 = actualSupportedCommands; _i < actualSupportedCommands_5.length; _i++) {
                var cmdActionPair = actualSupportedCommands_5[_i];
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResGrpNameResTypeResName() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "PUT", "DELETE"];
            resourceDefinition.apiVersion = "2016-04-01";
            resourceDefinition.children = ["slots"];
            var actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc", query: undefined, requestBody: undefined };
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            var scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedScripts = [];
            expectedScripts[0] = '# GET x123cloudsvc\nGet-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames -ResourceName "x123cloudsvc" -ApiVersion 2016-04-01\n\n';
            expectedScripts[1] = '# SET x123cloudsvc\n$PropertiesObject = @{\n\t#Property = value;\n}\nSet-AzureRmResource -PropertyObject $PropertiesObject -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames -ResourceName "x123cloudsvc" -ApiVersion 2016-04-01 -Force\n\n';
            expectedScripts[2] = '# DELETE x123cloudsvc\nRemove-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames -ResourceName "x123cloudsvc" -ApiVersion 2016-04-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            var expectedScriptIndex = 0;
            for (var _i = 0, actualSupportedCommands_6 = actualSupportedCommands; _i < actualSupportedCommands_6.length; _i++) {
                var cmdActionPair = actualSupportedCommands_6[_i];
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResGrpNameResTypeResNameSubType1() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2016-04-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            var scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedScripts = [];
            expectedScripts[0] = '# GET slots\nGet-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots -ResourceName "x123cloudsvc" -ApiVersion 2016-04-01\n\n';
            expectedScripts[1] = '# CREATE slots\n$ResourceLocation = "West US"\n$ResourceName = "Newslot"\n$PropertiesObject = @{\n\t#Property = value;\n}\nNew-AzureRmResource -Location $ResourceLocation -PropertyObject $PropertiesObject -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots -ResourceName "x123cloudsvc/$ResourceName" -ApiVersion 2016-04-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            var expectedScriptIndex = 0;
            for (var _i = 0, actualSupportedCommands_7 = actualSupportedCommands; _i < actualSupportedCommands_7.length; _i++) {
                var cmdActionPair = actualSupportedCommands_7[_i];
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResGrpNameResTypeResNameSubType1SubName1() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "DELETE", "PUT"];
            resourceDefinition.apiVersion = "2016-04-01";
            resourceDefinition.children = ["roles"];
            var actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production", query: undefined, requestBody: undefined };
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            var scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedScripts = [];
            expectedScripts[0] = '# GET Production\nGet-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots -ResourceName "x123cloudsvc/Production" -ApiVersion 2016-04-01\n\n';
            expectedScripts[1] = '# SET Production\n$PropertiesObject = @{\n\t#Property = value;\n}\nSet-AzureRmResource -PropertyObject $PropertiesObject -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots -ResourceName "x123cloudsvc/Production" -ApiVersion 2016-04-01 -Force\n\n';
            expectedScripts[2] = '# DELETE Production\nRemove-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots -ResourceName "x123cloudsvc/Production" -ApiVersion 2016-04-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            var expectedScriptIndex = 0;
            for (var _i = 0, actualSupportedCommands_8 = actualSupportedCommands; _i < actualSupportedCommands_8.length; _i++) {
                var cmdActionPair = actualSupportedCommands_8[_i];
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResGrpNameResTypeResNameSubType1SubName1SubType2() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2016-04-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            var scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedScripts = [];
            expectedScripts[0] = '# GET roles\nGet-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles -ResourceName "x123cloudsvc/Production" -ApiVersion 2016-04-01\n\n';
            expectedScripts[1] = '# CREATE roles\n$ResourceLocation = "West US"\n$ResourceName = "Newrole"\n$PropertiesObject = @{\n\t#Property = value;\n}\nNew-AzureRmResource -Location $ResourceLocation -PropertyObject $PropertiesObject -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles -ResourceName "x123cloudsvc/Production/$ResourceName" -ApiVersion 2016-04-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            var expectedScriptIndex = 0;
            for (var _i = 0, actualSupportedCommands_9 = actualSupportedCommands; _i < actualSupportedCommands_9.length; _i++) {
                var cmdActionPair = actualSupportedCommands_9[_i];
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResGrpNameResTypeResNameSubType1SubName1SubType2SubName2() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "DELETE", "PUT"];
            resourceDefinition.apiVersion = "2016-04-01";
            resourceDefinition.children = ["metricDefinitions", "metrics"];
            var actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1", query: undefined, requestBody: undefined };
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            var scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedScripts = [];
            expectedScripts[0] = '# GET WorkerRole1\nGet-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles -ResourceName "x123cloudsvc/Production/WorkerRole1" -ApiVersion 2016-04-01\n\n';
            expectedScripts[1] = '# SET WorkerRole1\n$PropertiesObject = @{\n\t#Property = value;\n}\nSet-AzureRmResource -PropertyObject $PropertiesObject -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles -ResourceName "x123cloudsvc/Production/WorkerRole1" -ApiVersion 2016-04-01 -Force\n\n';
            expectedScripts[2] = '# DELETE WorkerRole1\nRemove-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles -ResourceName "x123cloudsvc/Production/WorkerRole1" -ApiVersion 2016-04-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            var expectedScriptIndex = 0;
            for (var _i = 0, actualSupportedCommands_10 = actualSupportedCommands; _i < actualSupportedCommands_10.length; _i++) {
                var cmdActionPair = actualSupportedCommands_10[_i];
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResGrpNameResTypeResNameSubType1SubName1SubType2SubName2SubType3() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1/metricDefinitions";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            var scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedScripts = [];
            expectedScripts[0] = '# GET metricDefinitions\nGet-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles/metricDefinitions -ResourceName "x123cloudsvc/Production/WorkerRole1" -ApiVersion 2014-04-01\n\n';
            expectedScripts[1] = '# CREATE metricDefinitions\n$ResourceLocation = "West US"\n$ResourceName = "NewmetricDefinition"\n$PropertiesObject = @{\n\t#Property = value;\n}\nNew-AzureRmResource -Location $ResourceLocation -PropertyObject $PropertiesObject -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles/metricDefinitions -ResourceName "x123cloudsvc/Production/WorkerRole1/$ResourceName" -ApiVersion 2014-04-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            var expectedScriptIndex = 0;
            for (var _i = 0, actualSupportedCommands_11 = actualSupportedCommands; _i < actualSupportedCommands_11.length; _i++) {
                var cmdActionPair = actualSupportedCommands_11[_i];
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResGrpNameResTypeResNameSubType1SubName1SubType2SubName2SubType3SubName3() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["PUT", "GET", "DELETE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            var actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1/metricDefinitions/Percentage CPU", query: undefined, requestBody: undefined };
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1/metricDefinitions/Percentage CPU";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            var scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedScripts = [];
            expectedScripts[0] = '# GET Percentage CPU\nGet-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles/metricDefinitions -ResourceName "x123cloudsvc/Production/WorkerRole1/Percentage CPU" -ApiVersion 2014-04-01\n\n';
            expectedScripts[1] = '# SET Percentage CPU\n$PropertiesObject = @{\n\t#Property = value;\n}\nSet-AzureRmResource -PropertyObject $PropertiesObject -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles/metricDefinitions -ResourceName "x123cloudsvc/Production/WorkerRole1/Percentage CPU" -ApiVersion 2014-04-01 -Force\n\n';
            expectedScripts[2] = '# DELETE Percentage CPU\nRemove-AzureRmResource -ResourceGroupName cloudsvcrg -ResourceType Microsoft.ClassicCompute/domainNames/slots/roles/metricDefinitions -ResourceName "x123cloudsvc/Production/WorkerRole1/Percentage CPU" -ApiVersion 2014-04-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            var expectedScriptIndex = 0;
            for (var _i = 0, actualSupportedCommands_12 = actualSupportedCommands; _i < actualSupportedCommands_12.length; _i++) {
                var cmdActionPair = actualSupportedCommands_12[_i];
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
        function scriptResourceUrlWithList() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["PUT", "GETPOST"];
            resourceDefinition.apiVersion = "2016-03-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "POST";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rgrp1/providers/Microsoft.Web/sites/WebApp120170517014339/config/appsettings/list";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            var scriptGenerator = new armExplorer.PowerShellScriptGenerator(resolver);
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedScripts = [];
            expectedScripts[0] = '# LIST appsettings\n$resource = Invoke-AzureRmResourceAction -ResourceGroupName rgrp1 -ResourceType Microsoft.Web/sites/config -ResourceName "WebApp120170517014339/appsettings" -Action list -ApiVersion 2016-03-01 -Force\n$resource.Properties\n\n';
            expectedScripts[1] = '# SET list\n$PropertiesObject = @{\n\t#Property = value;\n}\nNew-AzureRmResource -PropertyObject $PropertiesObject -ResourceGroupName rgrp1 -ResourceType Microsoft.Web/sites/config -ResourceName "WebApp120170517014339/appsettings" -ApiVersion 2016-03-01 -Force\n\n';
            armExplorer.throwIfNotEqual(expectedScripts.length, actualSupportedCommands.length);
            var expectedScriptIndex = 0;
            for (var _i = 0, actualSupportedCommands_13 = actualSupportedCommands; _i < actualSupportedCommands_13.length; _i++) {
                var cmdActionPair = actualSupportedCommands_13[_i];
                armExplorer.throwIfNotEqual(expectedScripts[expectedScriptIndex++], scriptGenerator.getScript(cmdActionPair));
            }
            armExplorer.logSuccess(arguments);
        }
    })(PsScriptGeneratorTests || (PsScriptGeneratorTests = {}));
})(armExplorer || (armExplorer = {}));
var armExplorer;
(function (armExplorer) {
    var ScriptParameterResolverTests;
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
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            var expectedcCmdletParameters = [];
            var cmdletParameters = {};
            var cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithIDOnly;
            cmdletResourceInfo.resourceId = "/subscriptions";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2014-04-01";
            cmdletParameters.isCollection = false;
            expectedcCmdletParameters.push(cmdletParameters);
            var cmdIndex = 0;
            for (var _i = 0, actualSupportedCommands_14 = actualSupportedCommands; _i < actualSupportedCommands_14.length; _i++) {
                var actualCmdType = actualSupportedCommands_14[_i];
                armExplorer.throwIfObjectNotEqual(expectedcCmdletParameters[cmdIndex], resolver.getParameters());
            }
            armExplorer.logSuccess(arguments);
        }
        function getParametersForSubscriptionsSubId() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            var expectedCmdletParameters = [];
            var cmdletParameters = {};
            var cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithIDOnly;
            cmdletResourceInfo.resourceId = "/subscriptions/00000000-0000-0000-0000-000000000000";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2014-04-01";
            cmdletParameters.isCollection = false;
            expectedCmdletParameters.push(cmdletParameters);
            var cmdIndex = 0;
            for (var _i = 0, actualSupportedCommands_15 = actualSupportedCommands; _i < actualSupportedCommands_15.length; _i++) {
                var actualCmdType = actualSupportedCommands_15[_i];
                armExplorer.throwIfObjectNotEqual(expectedCmdletParameters[cmdIndex], resolver.getParameters());
            }
            armExplorer.logSuccess(arguments);
        }
        function getParametersForSubscriptionsSubIdResGroup() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }, { cmd: "New-AzureRmResourceGroup", isAction: false, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            var cmdletParameters = {};
            var cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithIDOnly;
            cmdletResourceInfo.resourceId = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2014-04-01";
            cmdletParameters.isCollection = false;
            armExplorer.throwIfObjectNotEqual(cmdletParameters, resolver.getParameters());
            armExplorer.logSuccess(arguments);
        }
        function getParametersForResourceIDOnlyWithResourceGroupName() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "PUT", "DELETE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = ["exportTemplate", "moveResources", "providers", "validateMoveResources"];
            var actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/6e6e25b…-43f4-bdde-1864842e524b/resourceGroups/cloudsvcrg", query: undefined, requestBody: undefined };
            actions[1] = { httpMethod: "POST", name: "exportTemplate", url: "https://management.azure.com/subscriptions/6e6e25b…842e524b/resourceGroups/cloudsvcrg/exportTemplate", query: undefined, requestBody: "{'options': 'IncludeParameterDefaultValue, IncludeComments', 'resources': ['* ']}" };
            actions[2] = { httpMethod: "POST", name: "moveResources", url: "https://management.azure.com/subscriptions/6e6e25b…842e524b/resourceGroups/cloudsvcrg/moveResources", query: undefined, requestBody: "{'targetResourceGroup': '(string)','resources': ['(string)']}" };
            actions[3] = { httpMethod: "POST", name: "validateMoveResources", url: "https://management.azure.com/subscriptions/6e6e25b…842e524b/resourceGroups/cloudsvcrg/validateMoveResources", query: undefined, requestBody: "{'targetResourceGroup': '(string)','resources': ['(string)']}" };
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedSupportedCommands = [
                { cmd: "Get-AzureRmResource", isAction: false, isSetAction: false },
                { cmd: "Set-AzureRmResource", isAction: false, isSetAction: true },
                { cmd: "Remove-AzureRmResource", isAction: true, isSetAction: false },
                { cmd: "Invoke-AzureRmResourceAction", isAction: true, isSetAction: false },
                { cmd: "Invoke-AzureRmResourceAction", isAction: true, isSetAction: false },
                { cmd: "Invoke-AzureRmResourceAction", isAction: true, isSetAction: false }
            ];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            var cmdletParameters = {};
            var cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithIDOnly;
            cmdletResourceInfo.resourceId = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2014-04-01";
            cmdletParameters.isCollection = false;
            armExplorer.throwIfObjectNotEqual(cmdletParameters, resolver.getParameters());
            armExplorer.logSuccess(arguments);
        }
        function getParametersForResGrpNameResType() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2016-04-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }, { cmd: "New-AzureRmResource", isAction: false, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            var cmdletParameters = {};
            var cmdletResourceInfo = {};
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
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "PUT", "DELETE"];
            resourceDefinition.apiVersion = "2016-04-01";
            resourceDefinition.children = ["slots"];
            var actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc", query: undefined, requestBody: undefined };
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }, { cmd: "Set-AzureRmResource", isAction: false, isSetAction: true },
                { cmd: "Remove-AzureRmResource", isAction: true, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            var cmdletParameters = {};
            var cmdletResourceInfo = {};
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
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }, { cmd: "New-AzureRmResource", isAction: false, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            var cmdletParameters = {};
            var cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithGroupTypeName;
            cmdletResourceInfo.resourceGroup = "cloudsvcrg";
            cmdletResourceInfo.resourceName = "x123cloudsvc";
            cmdletResourceInfo.resourceType = "Microsoft.ClassicCompute/domainNames/slots";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2014-04-01";
            cmdletParameters.isCollection = false; // bug fix
            armExplorer.throwIfObjectNotEqual(cmdletParameters, resolver.getParameters());
            armExplorer.logSuccess(arguments);
        }
        function getParametersForResGrpNameResTypeResNameSubType1SubName1() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "DELETE", "PUT"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = ["roles"];
            var actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production", query: undefined, requestBody: undefined };
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }, { cmd: "Set-AzureRmResource", isAction: false, isSetAction: true },
                { cmd: "Remove-AzureRmResource", isAction: true, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            var cmdletParameters = {};
            var cmdletResourceInfo = {};
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
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }, { cmd: "New-AzureRmResource", isAction: false, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            var cmdletParameters = {};
            var cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithGroupTypeName;
            cmdletResourceInfo.resourceGroup = "cloudsvcrg";
            cmdletResourceInfo.resourceName = "x123cloudsvc/Production";
            cmdletResourceInfo.resourceType = "Microsoft.ClassicCompute/domainNames/slots/roles";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2014-04-01";
            cmdletParameters.isCollection = false; // bug fix
            armExplorer.throwIfObjectNotEqual(cmdletParameters, resolver.getParameters());
            armExplorer.logSuccess(arguments);
        }
        function getParametersForResGrpNameResTypeResNameSubType1SubName1SubType2SubName2() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "DELETE", "PUT"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = ["metricDefinitions", "metrics"];
            var actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1", query: undefined, requestBody: undefined };
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }, { cmd: "Set-AzureRmResource", isAction: false, isSetAction: true },
                { cmd: "Remove-AzureRmResource", isAction: true, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            var cmdletParameters = {};
            var cmdletResourceInfo = {};
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
            var resourceDefinition = {};
            resourceDefinition.actions = ["GET", "CREATE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1/metricDefinitions";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }, { cmd: "New-AzureRmResource", isAction: false, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            var cmdletParameters = {};
            var cmdletResourceInfo = {};
            cmdletResourceInfo.resourceIdentifierType = armExplorer.ResourceIdentifierType.WithGroupTypeName;
            cmdletResourceInfo.resourceGroup = "cloudsvcrg";
            cmdletResourceInfo.resourceName = "x123cloudsvc/Production/WorkerRole1";
            cmdletResourceInfo.resourceType = "Microsoft.ClassicCompute/domainNames/slots/roles/metricDefinitions";
            cmdletParameters.resourceIdentifier = cmdletResourceInfo;
            cmdletParameters.apiVersion = "2014-04-01";
            cmdletParameters.isCollection = false; //bug fix
            armExplorer.throwIfObjectNotEqual(cmdletParameters, resolver.getParameters());
            armExplorer.logSuccess(arguments);
        }
        function getParametersForResGrpNameResTypeResNameSubType1SubName1SubType2SubName2SubType3SubName3() {
            var resourceDefinition = {};
            resourceDefinition.actions = ["PUT", "GET", "DELETE"];
            resourceDefinition.apiVersion = "2014-04-01";
            resourceDefinition.children = "{name}";
            var actions = [];
            actions[0] = { httpMethod: "DELETE", name: "Delete", url: "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1/metricDefinitions/Percentage CPU", query: undefined, requestBody: undefined };
            var value = {};
            value.httpMethod = "GET";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/cloudsvcrg/providers/Microsoft.ClassicCompute/domainNames/x123cloudsvc/slots/Production/roles/WorkerRole1/metricDefinitions/Percentage CPU";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, actions));
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedSupportedCommands = [{ cmd: "Get-AzureRmResource", isAction: false, isSetAction: false }, { cmd: "Set-AzureRmResource", isAction: false, isSetAction: true },
                { cmd: "Remove-AzureRmResource", isAction: true, isSetAction: false }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            var cmdletParameters = {};
            var cmdletResourceInfo = {};
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
            var resourceDefinition = {};
            resourceDefinition.actions = ["PUT", "GETPOST"];
            resourceDefinition.apiVersion = "2016-03-01";
            var value = {};
            value.httpMethod = "POST";
            value.url = "https://management.azure.com/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rgrp1/providers/Microsoft.Web/sites/WebApp120170517014339/config/appsettings/list";
            value.resourceDefinition = resourceDefinition;
            var resolver = new armExplorer.ScriptParametersResolver(new armExplorer.ARMUrlParser(value, []));
            var scriptor = new armExplorer.PowerShellScriptGenerator(resolver);
            var actualSupportedCommands = resolver.getSupportedCommands();
            var expectedSupportedCommands = [{ cmd: "Invoke-AzureRmResourceAction", isAction: false, isSetAction: false }, { cmd: "New-AzureRmResource", isAction: false, isSetAction: true }];
            armExplorer.throwIfArrayNotEqual(expectedSupportedCommands, actualSupportedCommands);
            var cmdletParameters = {};
            var cmdletResourceInfo = {};
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
        var count = 0;
        for (var key in arg) {
            if (arg.hasOwnProperty(key)) {
                count++;
            }
        }
        return count;
    }
    armExplorer.keyCount = keyCount;
    function throwIfObjectNotEqual(expected, actual) {
        throwIfNotEqual(keyCount(expected), keyCount(actual));
        for (var key in expected) {
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
        for (var i in expectedStrings) {
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
        var currentFunction = callerArg.callee.toString();
        console.log(currentFunction.substr(0, currentFunction.indexOf('(')).replace("function", "TEST") + " :PASSED");
    }
    armExplorer.logSuccess = logSuccess;
})(armExplorer || (armExplorer = {}));
