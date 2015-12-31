/**
 * Created by EvgeniyChaika on 25.11.15.
 */
//$(function () {
window.App = {
    Models: {},
    Views: {},
    Collections: {},
    Helpers: {},
    Routers: {}
};
Parse.initialize("Your JavaScript Parse key");


App.vent = _.extend({}, Parse.Events);
App.Helpers.template = function (id) {
    console.log("AppHelper!!!!!!!!");
    console.log(id);
    return _.template($('#' + id).html());
};

//-------------------------------------Models----------------------------------------------------

App.Models.Task = Parse.Object.extend("ListTasks", {
    defaults: {
        sold: false
    },

    toggleTextSoldState: function () {
        this.get('sold') ? this.set('sold', false) : this.set('sold', true);
    }
});

App.Models.User = Parse.Object.extend("User");

//--------------------------------Collection--------------------------------------------------------
App.Collections.TaskCollection = Parse.Collection.extend({
    model: App.Models.Task
});

//-------------------------------------Views---------------------------------------------------------

//---------------------------------Views Tasks---------------------------------------------

App.Views.TaskView = Parse.View.extend({
    tagName: 'li',

    initialize: function () {
        var task = this.model;
        var li = this.el;
        this.model.on('change:title', this.render, this);
        this.model.on('destroy', this.remove, this);
        this.model.on('invalid', function (model, error) {
            alert(error);
        }, this);
        this.model.get('sold') ? this.$el.addClass('task-is-done')
            : this.$el.removeClass('task-is-done');
        Hammer(this.el).on("doubletap", function () {
            console.log("Deleted Swipe");

            $(li).addClass("transit");
            $(li).on("transitionend ", func);

            function func() {
                console.log("transition");
                task.destroy();
            }
        });
    },
    events: {
        'click .state-toggle': 'toggleTextSoldState',
        'click .edit-text': 'editText',
        'click .delete-task': 'destroy',
        'click .share-task': 'shareTask'
    },

    template: _.template($('#ad-template').html()),
    render: function () {
        this.$el.html(this.template(this.model.toJSON()));

        return this;
    },
    toggleTextSoldState: function () {
        this.model.toggleTextSoldState();
        this.model.get('sold') ? this.$el.addClass('task-is-done') : this.$el.removeClass('task-is-done');
        this.model.save();
    },
    editText: function () {
        var newText = prompt('Enter please new text ', this.model.get('title'));
        if (newText === null) return;
        this.model.save('title', newText, {validate: true});

    },
    destroy: function () {
        this.model.destroy();
    },
    shareTask: function () {
        var textName = prompt('Edit User name: ', "");
        if (textName === null) return;
        var relation = this.model.relation("share");
        var query = new Parse.Query(Parse.User);
        query.equalTo("username", textName);
        query.first({
            success: function (object) {
                relation.add(object);

                this.model.save();
            }.bind(this),
            error: function (error) {
                alert("Error: " + error.code + " " + error.message);
            }
        });
    },
    remove: function () {
        this.$el.remove();
    }
});

App.Views.TaskCollectionView = Parse.View.extend({
    tagName: 'ol',

    initialize: function () {
        this.collection.on('add', this.addOne, this);
    },

    render: function () {
        this.$el.empty();
        this.collection._reset();
        this.collection.each(this.addOne, this);
        var query = new Parse.Query(App.Models.Task);
        var query1 = new Parse.Query(App.Models.Task);
        query.equalTo('user', Parse.User.current());
        query1.equalTo('share', Parse.User.current());
        var allQuery = Parse.Query.or(query, query1);
        allQuery.find({
            success: function (results) {
                _.each(results, function (value) {
                    this.collection.add(value);
                }, this);
            }.bind(this)
        });
        return this;

    },

    addOne: function (ad) {
        var adView = new App.Views.TaskView({model: ad});
        this.$el.append(adView.render().el);
    }
});

App.Views.AddNewTaskView = Parse.View.extend({
    el: '#content',
    render: function (name) {
        this.$el.html(
            App.Helpers.template(name)
        );
        return this;
    },
    events: {
        'click .addTask': 'addTask',
        'click .login-out': 'userLogOut'
    },
    addTask: function (e) {
        e.preventDefault();
        var newTextInput = this.$el.find('.make-input').val();
        var user = Parse.User.current();
        var task = new App.Models.Task({
            title: newTextInput,
            user: user
        });
        task.save();
        this.collection.add(task);
        console.log(this.collection);
        this.clear();
    },
    clear: function () {
        this.$el.find('.make-input').val("");
    },
    userLogOut: function () {
        Parse.User.logOut();
        $('#current-user').html("");
        console.log("Clear!");
        Parse.history.navigate("", true);
        console.log("LoginOut!!!");

        $('ol').remove();
        this.render('start-page');
        this.undelegateEvents();
        delete this;
    }
});

//---------------------------Views Users-------------------------

App.Views.UserView = Parse.View.extend({});

App.Views.AddNewUserView = Parse.View.extend({
    el: '#content',
    render: function (name) {
        console.log("Рендерит !!!");
        this.$el.html(
            App.Helpers.template(name)
        );
        return this;
    },
    events: {
        'click #submit1': 'register',
        'click #out-register': 'quit'
    },
    register: function (ev) {
        ev.preventDefault();
        var textLoginUser = this.$el.find('.loginUser').val();
        var textPasswordUser = this.$el.find('.passwordUser').val();
        var textMailUser = this.$el.find('.mailUser').val();

        var user = new App.Models.User();
        user.set("username", textLoginUser);
        user.set("password", textPasswordUser);
        user.set("email", textMailUser);

        user.signUp(null, {
            success: function () {
                console.log("Register OK!");
                Parse.User.logIn(textLoginUser, textPasswordUser, {
                    success: function () {
                        console.log("USERIN!!!Рендерит логин ");
                        Parse.history.navigate("/user/" + Parse.User.current().id, true);
                    }.bind(this),
                    error: function (user, error) {
                        console.log("Log In Error " + error.message);
                    }
                });
                this.render('add-task');
            }.bind(this),
            error: function (user, error) {
                console.log("Error register: " + error.message);
            }
        });
        this.clearRegisterFields();
    },
    quit: function () {
        Parse.history.navigate("");
        console.log("Quit");
       this.render('start-page');
    },
    clearRegisterFields: function () {
        this.$el.find('.loginUser').val("");
        this.$el.find('.passwordUser').val("");
        this.$el.find('.mailUser').val("");
    }
});

App.Views.StartPage = Parse.View.extend({
    el: '#content',

    render: function (name) {
        this.$el.html(
            App.Helpers.template(name)
        );
        return this;
    },

    events: {
        'click #start-register': 'registerUser',
        'click #submit2': 'userLogIn'
    },

    userLogIn: function (e) {
        e.preventDefault();

        var loginUser = this.$el.find('.loginUserIn').val();
        var passwordUser = this.$el.find('.passwordUserIn').val();
        Parse.User.logIn(loginUser, passwordUser, {
            success: function () {
                console.log("USERIN!!!");
                this.render('add-task');
                Parse.history.navigate("/user/" + Parse.User.current().id, true);

            }.bind(this),
            error: function (user, error) {
                console.log("Log In Error " + error.message);
            }
        });
        this.clear();
    },

    registerUser: function () {

        this.render('reg');
        Parse.history.navigate("reg/");

    },

    clear: function () {
        this.$el.find('.loginUserIn').val("");
        this.$el.find('.passwordUserIn').val("");
    },
    init: function () {
        console.log("AppView");
        this.render('start-page');

    },

    user: function () {
        new App.Views.AddNewTaskView({collection: taskCollection});
        this.render('add-task');
        $('#content-field').html(taskCollectionView.render().el);
    }

});


//---------------------------Router-----------------------------

App.Routers.RoutApp = Parse.Router.extend({

    routes: {
        '': 'startApp',
        'reg/': 'registration',
        'user/:id': 'todos'
    },
    startApp: function () {

        console.log("startOK!");
        contentApp.init();
    },
    registration: function () {

        console.log("Router REG ");

        contentApp.registerUser();
    },
    todos: function () {
        if (!Parse.User.current()) {
            console.log("Router NO User.current()");
            Parse.history.navigate("", true);
            return;
        }
        if (Parse.User.current()) {
            console.log("Router User.current()");
            Parse.history.navigate("/user/" + Parse.User.current().id, true);
            contentApp.user();
        }

    }
});

//--------------Create------------------
new App.Routers.RoutApp();

new App.Views.AddNewUserView();
var taskCollection = new App.Collections.TaskCollection([]);
var taskCollectionView = new App.Views.TaskCollectionView({collection: taskCollection});

var contentApp = new App.Views.StartPage();

Parse.history.start();

//});