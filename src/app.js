import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
    
}));

// ============== three major configurations ==================== //
app.use(express.json({limit:"16kb"})); // when data comes from json ,here i have set limit 16kb
app.use(express.urlencoded({extended:true,limit:"16kb"})); // when data comes from URL ,limit set 16kb
app.use(express.static("public"))// for public folder like img ,favicons etc
// --------- cookies --------- //
app.use(cookieParser());

export {app}