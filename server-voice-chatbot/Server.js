


const express = require('express');
const cors = require('cors');
const mongoose= require('mongoose');
const bcrypt= require('bcrypt');
const jwt= require('jsonwebtoken');
require('dotenv').config();

const { Configuration, OpenAIApi } = require('openai');

const app = express();
const port = process.env.PORT||5003;

app.use(express.json());
app.use(cors());

const ChatSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  query: { type: String, required: true },
  response: { type: String, required: true },
  timeStamp:{  type:String, required:true},
});
const UserChat = mongoose.model('userChat', ChatSchema);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db= mongoose.connection;
db.on('error',console.error.bind(console,'mongodb connection error:'));
db.once('open',()=>
{
    console.log('connected to mongodb');

});






const config = new Configuration({
  apiKey:process.env.API_KEY , 
});

const openai = new OpenAIApi(config);

app.get('/', (req, res) => {
  res.send('Server is running');
  console.log(req.body.userInput);
});

app.post('/Server', async (req, res) => {
  const userInput= req.body.userInput;
  const currentUserId= userInput.currentUserId;
  const query= userInput.Query;
  const prompt=query;
  var ServerResponse="";

  console.log(userInput);

  try {
    const response = await openai.createCompletion({
      		model: "text-davinci-003",
      		prompt: prompt,
      		max_tokens: 100,
      		temperature: 1,
      	});

    const parsableJSONresponse = response.data.choices[0].text;

    console.log('Generated response:', parsableJSONresponse);
  ServerResponse= parsableJSONresponse;

  const chat= new UserChat({

    userId:currentUserId,
    query:query,
    response:ServerResponse,
    timeStamp:new Date()
  });

  await chat.save();



    res.json({ response: ServerResponse });
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'An error occurred while generating the response' });
  }
});







const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);


app.get('/register', async (req, res) => {

  console.log('registration api called');
});

app.post('/register', async (req, res) => {
  console.log('registration api called');


  try {
    const { email, password } = req.body;


    console.log("email:", email, "password:", password);


    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(400).json({ message: 'User with email id already exists' });
    }

    const Hashrounds = 10;
    const hashedPassword = await bcrypt.hash(password, Hashrounds);
    const newUser = new User({ email, password: hashedPassword });
    newUser.save();

    res.status(200).json({ success: true , message:'Registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/login', async (req, res) => {
  console.log("login API is called");

  try {
    const { email, password } = req.body;

    console.log("email:", email, "password:", password);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign({ userId: user._id }, 'secretKey');
    console.log("Token generated:", token);

    res.status(200).json({ success: true, userId: user._id, email: user.email, token });

  } catch (error) {
    console.log('Login error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post('/resetPassword',async(req,res) =>{



  const {email,newPassword} = req.body;

  const user= await User.findOne({email});


  if(!user)
  {
    return res.status(404).json({message:"user not found"});

  }

  try{

    const hashedPassword= await bcrypt.hash(newPassword,10);

    user.password=hashedPassword;
    await user.save();
    

    return res.status(200).json({message:"password updated successfully"});

  }catch(error)
  {
    console.log(error);
    return res.status(500).json({message:"internal server error"});

  }
});




app.post('/chatConvo', async (req, res) => {
  const curr_userId = req.body.userId;
  const query = req.body.query;

  console.log("Current user id is:", curr_userId);
  console.log("Query:", query);

  try {
    const conversations = await UserChat.find({ userId: curr_userId });

    res.json({ conversations });
    console.log(conversations);
  } catch (error) {
    console.log('Error:', error);
    res.status(500).json({ error: 'An error occurred while fetching conversations' });
  }
});


app.delete("/deleteConvo", async(req,res) =>
{

  const deleteIndex = req.body.deleteIndex;

  try
  {
    const response= await UserChat.deleteOne({_id:deleteIndex});
    if(response)
    {
      console.log("record deleted successfully");

    }
  }catch(error)
  {
    console.error("error while deleteing the record", error);

  }

});




app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
