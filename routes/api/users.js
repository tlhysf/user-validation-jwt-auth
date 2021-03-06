const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const keys = require('../../config/keys');
const passport = require('passport');

const validateRegisterInput = require('../../validation/register');
const validateLoginInput = require('../../validation/login');

// Load user model
const User = require('../../models/Users');

// @route   GET api/users/test
// @desc    Tests users route
// @access  Public
router.get('/test', (req, res) => res.json({ msg: 'users test' }));

// @route   POST api/users/register
// @desc    Register new users
// @access  Public
router.post('/register', (req, res) => {
	const { errors, isValid } = validateRegisterInput(req.body);

	if (!isValid) {
		return res.status(400).json(errors);
	}

	User.findOne({ email: req.body.email }).then((user) => {
		if (user) {
			errors.email = 'Email is already registered';
			return res.status(400).json(errors);
		} else {
			const avatar = gravatar.url(req.body.email, {
				s: '200', //Size
				r: 'pg', //rating
				d: 'mm', //default
			});

			const newUser = new User({
				name: req.body.name,
				email: req.body.email,
				password: req.body.password,
				avatar: avatar,
			});

			console.log(newUser);

			bcrypt.genSalt(10, (err, salt) => {
				bcrypt.hash(newUser.password, salt, (err, hash) => {
					if (err) throw err;
					newUser.password = hash;
					newUser
						.save()
						.then((user) => res.json(user))
						.catch((err) => console.log(err));
				});
			});
		}
	});
});

// @route   GET api/users/login
// @desc    Login users / return JWT token
// @access  Public
router.post('/login', (req, res) => {
	const { errors, isValid } = validateLoginInput(req.body);

	if (!isValid) {
		return res.status(400).json(errors);
	}

	const email = req.body.email;
	const password = req.body.password;

	//Find by email
	User.findOne({ email: email }).then((user) => {
		//Check for user
		if (!user) {
			errors.email = 'Email is not registered with any account';
			return res.status(404).json(errors);
		}

		//User exists, check for password
		//User.password is hashed password picked up from db, password is coming in from login form
		bcrypt.compare(password, user.password).then((isMatch) => {
			if (isMatch) {
				// res.json({msg: 'Success'});

				const payload = {
					id: user.id,
					name: user.name,
					avatar: user.avatar,
				};

				//Password matched, sign token
				jwt.sign(
					payload,
					keys.jwtPayloadSecret,
					{ expiresIn: 3600 },
					(err, token) => {
						res.json({
							success: true,
							token: 'Bearer ' + token,
						});
					}
				);
			} else {
				errors.password = 'Incorrect password';
				return res.status(400).json(errors);
			}
		});
	});
});

// @route   GET api/users/current
// @desc    Return current user
// @access  Private

router.get(
	'/current',
	passport.authenticate('jwt', { session: false }),
	(req, res) => {
		res.json({
			id: req.user.id,
			name: req.user.name,
			email: req.user.email,
		});
	}
);
module.exports = router;
