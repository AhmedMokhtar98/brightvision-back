require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt'); 
const session = require('express-session');
const jwt = require('jsonwebtoken');
const {conn} = require('./conn')

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(cors({
	origin: true,
	methods: ["GET", "POST", "PUT", "DELETE"],
	credentials: true,
}));

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({
	key:"server_session",
	secret:'subscribe',
	resave:false,
	saveUninitialized:false,
	cookie: {
		expires: new Date(Date.now() + (30 * 86400 * 1000)),
	},
})
);
// parse application/json
app.use(bodyParser.json());
app.get("/", (req,res)=>{ res.json('hello from server') })

/*----------------------------Refresh Tokens-----------------------------*/
let refreshTokens = []
app.post('/api/token', (req, res) => {
  const refreshToken = (req.body.headers)
  if (refreshToken == null) return res.sendStatus(401)
  if (!refreshTokens.includes(refreshToken)) return res.sendStatus(403)
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403)
    const accessToken = generateAccessToken({ userid: user.userid, username:user.username, role: user.role, auth:true })
    res.json({ accessToken: accessToken })
  })
})

/*----------------------------generateAccessToken Tokens-----------------------------*/

function generateAccessToken(user) { return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' }) }

/*----------------------------MiddleWare Token verify-----------------------------*/
function authenticateToken(req, res, next) {
	const authHeader = req.headers['authorization']
	const token = authHeader && authHeader.split(' ')[1]
	if (token == null) return res.sendStatus(401)
  
	jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
	if (err){res.json({auth:false, message:'Failed Authenticating'})}
	else{res.json({auth:true, message:'Success Authenticating'})}
	  req.user = user
	  next()
	})
}
app.get("/api/isUserAuth", authenticateToken ,(req,res)=>{ })
/*--------------------------------------------------------*/


app.post("/api/auth", async(req,res)=>{
	const sql =`SELECT * FROM users where username='${req.body.UserName}' `
	console.log(sql);
	conn.query(sql, async(err,result)=>{
		if(err) throw err;
		if(result.length>0){
			const comparison = await bcrypt.compare( req.body.Password, result[0].password)       
			if(comparison){ 
				req.session.user = result
				const x = JSON.parse(JSON.stringify(result))
				const userid = x[0].userid
				const username = x[0].username
				const role = x[0].role
				const user = { userid: userid, username:username, role: role, auth:true}

				const accessToken = generateAccessToken(user)
				const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET)
				refreshTokens.push(refreshToken)
				res.json({ 
					status:true,
					accessToken: accessToken,
					refreshToken: refreshToken,
					userData:{
						userid:userid,
						username:username,
						role:role
					}
				})
			}
			else{ res.send({ status:'الرقم السري غير صحيح', }) }
		}
		else{ res.send({ status:'المستخدم غير موجود', }) }
	})
})

app.delete('/api/logout', (req, res) => {
	refreshTokens = refreshTokens.filter(token => token !== req.body.token)
	res.sendStatus(204)
	req.session.destroy();
})


//start server 
app.listen(8080, () => {console.log('Server started on port 8080')});