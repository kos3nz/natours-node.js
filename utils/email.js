const nodemailer = require('nodemailer');
const pug = require('pug');
const { htmlToText } = require('html-to-text');

// Usage: new Email(user, url).sendWelcome();
module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `kos <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // SendGrid
      // Since SendGrid is predefined by nodemailer, there is no need to specify the host server and port
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }

    // In 'development', use MailTrap
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Send the actual email
  async send(template, subject) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      // passing variable to pug file
      {
        firstName: this.firstName,
        url: this.url,
        subject,
      }
    );

    // 2) Define email options
    const mailOptions = {
      // where the email is coming from
      from: this.from,
      // the recipient email address
      to: this.to,
      // sub title
      subject,
      // html converted from text
      html,
      // text version of the email
      text: htmlToText(html),
      // https://github.com/html-to-text/node-html-to-text
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours Family!');
  }

  async sendPasswordReset() {
    await this.send(
      'resetPassword',
      'Your password reset token (valid for only 10 minutes)'
    );
  }
};

//:: =================================================== :://

// eslint-disable-next-line no-unused-vars
const sendEmail = async (options) => {
  // 1) Create a transporter
  const transporter = nodemailer.createTransport({
    // nodemailer know how to configure some services like Gmail, Yahoo, Hotmail or many others, so I don't have to configure manually myself
    // service: 'Gmail',
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    // Activate in gmail "less secure app" option
    // NOTE: It's not a good practice if using Gmail for this kind of production app, because I can only send 500 emails per day, and also they are quickly marked as a spammer. As such, unless I create an app for private use, I should use another service like "SendGrid" and "Mailgun"
  });

  // 2) Define the email options
  const mailOptions = {
    // where the email is coming from
    from: 'kos <hello@kos.io>',
    // the recipient email address
    to: options.email,
    subject: options.subject,
    // text version of the email
    text: options.message,
    // html converted from text
    // html:
  };

  // 3) Actually send the email
  // sendMail is asynchronous function and returns a promise
  // this time I don't need the return value
  await transporter.sendMail(mailOptions);
};
