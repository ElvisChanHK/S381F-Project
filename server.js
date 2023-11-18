//env
const MONGO_CONNECTION_URL="mongodb://localhost:27017/proj";
const SESSION_SECRET = "test_session";

const express = require('express');
const bodyParser = require('body-parser');
const engine = require('ejs-locals');

const app = express()
app.use(bodyParser.urlencoded({ extended: true }))

app.engine('ejs',engine)
app.set('views','./views')
app.set('view engine','ejs')

//Models

const Prodect = require('./models/prodect');
const User = require('./models/user');

//Setup MongoDB & Session
const { start_mongodb } = require('./models/mongodb');
const { session, session_config } = require('./models/session');
start_mongodb();
app.use(session(session_config));
console.log(session_config);

/**
 * Insert user from mongoDB
 * @param {string} username
 * @param {string} password
 * @param {string} role
 */

async function insertUser(username, password, role) {
    const userinfo = await getUser(username);
    const newUser = new User();
    flag = false;

    if (userinfo == null) {
        newUser.username = username;
        newUser.password = password;
        newUser.role = role;
        newUser.setPassword(password);
        flag = true;
    }
        
    if (flag) {
        await newUser.save();
        msg = `${username} added successfully`;
        console.log(msg);
        return msg;
    } else {
        msg = `Failed to add ${username}`;
        console.log(`Failed to add ${username}`);
        return msg;
    }
}

/**
 * Update user from mongoDB
 * @param {string} username
 * @param {string} old_pw Old Password
 * @param {string} new_pw New Password
 * @param {string} role
 * @returns {boolean}
 */
async function updateUser(username, old_pw, new_pw, role) {
    const userinfo = await getUser(username);
    flag = false;
    
    if (userinfo != null) {

        //Check wherever the old password is the same
        if (userinfo.validPassword(old_pw)) {
            userinfo.password = new_pw;
            userinfo.role = role;
            userinfo.setPassword(new_pw);
            flag = true;
        }

        if (flag) {
            await userinfo.save();
            msg = `${username} password updated`;
            console.log(msg);
            return true;
        } else {
            msg = `Failed to update ${username} password`;
            console.log(msg);
            return false;
        }        
    }
}

/**
 * Delete user from mongoDB
 * @param {string} username
 */
async function deleteUser(username) {
    try {
        const userinfo = await User.findOneAndDelete({ username: username });
        console.log(userinfo);
        if (!userinfo) {
            msg = "User not found!";
            console.log(msg);
            return msg;
        }
        msg = `${username} deleted`;
        console.log(msg);
        return msg;
    } catch (err) {
        console.log(err);
        return err;
    }
}

/**
 * Get user info from mongoDB
 * @param {string} username 
 * @returns the user name or null
 */

async function getUser(username) {
    const foundUser = await User.findOne({ username: username });
    return foundUser;
}

async function getUserRole(username) {
    const foundUser = await User.findOne({ username: username });
    role = foundUser.role;
    return role;
}

async function login(username, password) {
    const userinfo = await getUser(username);
    if (userinfo == null) {
        return false;
    }
    console.log(userinfo.validPassword(password));
    return userinfo.validPassword(password);
}

//Route
app.use(express.static('public'));

app.get('/', (req, res, next) => {
    return res.redirect('/auth/login');
});

app.get('/home',auth, (req, res, next) => {
    return res.status(200).write(`
        <html>
            <body>
                <h1>Welcome ${req.session.username}</h1>
                <h1>User Type: ${req.session.role}</h1>
                <a href="/profile">Profile</a>
                <a href="/auth/logout">Logout</a>
            </body>
        </html>
    `);
});

app.get('/profile', auth, async (req, res, next) => {
    const userinfo = await getUser(req.session.username);
    return res.render('profile.ejs', { "username": userinfo.username, "role": userinfo.role });
});

app.route('/profile/changepassword')
    .get(auth, async (req, res, next) => {
        const userinfo = await getUser(req.session.username);
        return res.render('changePW_new.ejs', { "username": userinfo.username });
    })
    .post(auth, async (req, res, next) => {
        const userinfo = await getUser(req.session.username);
        flag = await updateUser(req.session.username, req.body.old_pw, req.body.new_pw, userinfo.role);
        try{
            if (flag) {
                console.log('Password updated');
                return res.json({msg: 'Your password updated'});
            } else {
                console.log('Invalid old password');
                return res.status(401).send('Invalid old password');
            }
        } catch (err) {
            console.log(err);
            return res.status(500).send('Internal Server Error');
        }
        
    });


function auth(req, res, next) {
    if (req.session.username) {
        console.log('authenticated');
        next();
    } else {
        console.log('not authenticated');
        return res.redirect('/auth/login');
    }
}

app.route('/auth/login')
    .get((req, res, next) => {
        if (req.session.username) {
            console.log('authenticated');
            return res.redirect('/home');
        } else {
            console.log('not authenticated');
            return res.render('login_new.ejs');
        }
    })
    .post(async (req, res, next) => {
        try {
            if (req.body.username && req.body.password) {
                const username = req.body.username;
                const password = req.body.password;
                if (await login(username, password)) {
                    req.session.username = username;
                    req.session.role = await getUserRole(username);
                    console.log(req.session);
                    console.log("done");
                    return res.status(200).send({ 'redirect': '/home' });
                } else {
                    return res.status(401).json({ msg: 'Invalid username or password' });
                }
            } else {
                return res.status(401).json({ msg: 'Invalid username or password' });
            }
        } catch (err) {
            console.log(err);
            return res.status(500).json({ msg: 'Internal Server Error'});
        }
    });

app.get('/auth/logout', auth, async (req, res, next) => {
    req.session.destroy(() => {
        console.log('session destroyed');
    });
    return res.redirect('/auth/login');
});

app.get('/auth/*', (req, res, next) => {
    return res.redirect('/auth/login');
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
    const err = new Error('File Not Found');
    err.status = 404;
    next(err);
});

// error handler
// define as the last app.use callback
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send(err.message);
});

//Initialize User Data
//deleteUser('admin');
//deleteUser('demo');
//Insert default user
insertUser('admin', 'admin', 'admin');
insertUser('demo', 'demo', 'user');

//Start server
app.listen(3999, () => {
    console.log('server is listening on port 3999')
})