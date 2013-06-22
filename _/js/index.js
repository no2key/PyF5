
function queryAPI(cmd, params, callback, error_callback) {
    var url = '/_/api?';
    var callback_name = '_jsonp_callback_' + parseInt(Math.random() * 100000000000);
    var param_pairs = ['cmd=' + cmd, 'callback=' + callback_name];

    for (var key in params) {
        param_pairs.push(key + '=' + encodeURIComponent(params[key]));
    }
    url += param_pairs.join('&');

    window[callback_name] = function(data) {
        delete window[callback_name];
        if (data.status == 'ok') {
            callback(data);
        } else if (error_callback) {
            error_callback(data);
        } else {
            alert(data['message']);
        }
    };
    $.getScript(url)
        .fail(function(){
            if (window[callback_name]) {
                delete window[callback_name];
            }
        });
}


function ProjectModel(path) {
    var self = this;

    self.path = ko.observable(path);
}

function FileModel(data) {
    var self = this;

    self.name = ko.observable(data['name']);
    self.type = ko.observable(data['type']);
}

function ProjectsViewModel() {
    var self = this;

    self.projects = ko.observableArray([]);
    self.currentProject = ko.observable(null);

    self.folderSegments = ko.observableArray([]);
    self.files = ko.observableArray([]);

    self.clickFile = function(data, event) {
        if (data.type() == 'DIR') {
            self.folderSegments.push(data.name());
            self.enterFolderSegment(data.name());
        }
    };

    self.clickBreadCrumb = function(data, event) {
        console.log('clickBreakCrumb', data, typeof data);
        if (typeof data == 'object') {
            self.enterFolderSegment('');
        } else {
            self.enterFolderSegment(data);
        }
    };

    self.enterFolderSegment = function (name) {
        var path = self.currentProject().path();
        var matched_index = -1;
        $(self.folderSegments()).each(function(i, segment) {
            path += ('/' + segment);
            if (name == segment) {
                matched_index = i;
                return false;
            }
        });
        if (matched_index > -1) {
            self.queryFileList(path);
        } else {
            self.queryFileList(self.currentProject().path());
        }
        self.folderSegments.splice(matched_index+1);
    };

    self.queryFileList = function(path) {
        queryAPI('listDir', {path:path}, function(data) {
            self.files.removeAll();
            $(data['list']).each(function(i, obj) {
                self.files.push(new FileModel(obj));
            });
        });
    };

    self.selectProject = function(project) {
        if (project != self.currentProject()) {
//            queryAPI('setPath', {path:project.path()}, function(data) {
                self.currentProject(project);
                self.queryFileList(project.path());
//            })
        }
    };

    self.selectProjectWithPath = function(path) {
        $(self.projects()).each(function(i, project) {
            if (project.path() == path) {
                self.selectProject(project);
                return false;
            }
        });
    };

    self.updateProjectsWithPaths = function(paths) {
        self.projects.removeAll();
        $(paths).each(function(i, path) {
            self.projects.push(new ProjectModel(path));
        });
    };

    self.onSubmit = function(formElement) {
        var new_path = $("#new-path-input").val();
        if (new_path) {
            queryAPI('addPath', {path:new_path}, function(data) {
                self.updateProjectsWithPaths(data['paths']);
            });
        }
        return false;
    };
}

var vm = new ProjectsViewModel();

ko.applyBindings(vm);

$(function(){
    queryAPI('getPaths', {}, function(data) {
        vm.updateProjectsWithPaths(data['paths']);
        queryAPI('getPath', {}, function(data) {
            vm.selectProjectWithPath(data.path);
        });
    });
});