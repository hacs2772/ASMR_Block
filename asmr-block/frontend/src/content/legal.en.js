import React from 'react';
import { CONTACT_EMAIL } from './contact';

/**
 * Privacy Policy · Terms of Service, English translation of legal.ko.js (same sections in the same order).
 * The Korean original prevails — when legal.ko.js changes, update this file too.
 */
export const EFFECTIVE = 'November 15, 2026';

/** Shown at the top of the English pages only */
export const NOTICE = {
  text: 'This English version is a translation provided for convenience. If it differs from the Korean original, the Korean version applies.',
  original: 'Read the Korean original',
};

export const PRIVACY = {
  title: 'Privacy Policy',
  intro: <>ASMR Block (the &lsquo;Service&rsquo;) collects only the information it needs for you to build and listen to your own ASMR combos, and handles it as described below.</>,
  sections: [
    {
      title: 'Information we collect',
      body: (
        <ul>
          <li><b>Sign-up</b>: email, password (stored in a form no one can read), nickname</li>
          <li><b>Try the beta now</b>: a guest account the Service creates for you (a random email, password and nickname). These account details are saved in your browser (or on your device in the app)</li>
          <li><b>Information created as you use the Service</b>: combos you make, blocks you collect, listening history (when you played which block or combo), the sounds, videos and photos you upload with their titles, descriptions and recording locations, feedback and reports you send with any contact details you include, and the language you choose</li>
          <li><b>Information created automatically when you connect</b>: access logs such as your IP address and browser type</li>
        </ul>
      ),
    },
    {
      title: 'How we use it',
      body: (
        <ul>
          <li>Logging in and managing your account</li>
          <li>Building, saving and playing combos; the Block Shop and your block box</li>
          <li>Reviewing uploaded blocks (admin approval) and showing who made them</li>
          <li>Statistics such as &lsquo;Trending&rsquo;, and improving the Service</li>
          <li>Replying to your feedback and preventing abuse</li>
        </ul>
      ),
    },
    {
      title: 'How long we keep it, and deletion',
      body: (
        <ul>
          <li>We keep your account information <b>until you delete your account</b>.</li>
          <li>When you delete your account, we delete your combos and erase your email and nickname so you can no longer be identified. Listening history and collected blocks remain only in statistics, in a form that can&rsquo;t identify you.</li>
          <li>Blocks you uploaded may already be in other people&rsquo;s block boxes, so they may stay under the name &lsquo;Deleted user&rsquo;. If you want them removed, contact us at the address below.</li>
          <li>A beta guest account can only be reopened in the same browser or device. If you clear your browser data you can&rsquo;t get back in, so if you want it deleted, open the guest account and choose &lsquo;My account → Delete account&rsquo;.</li>
        </ul>
      ),
    },
    {
      title: 'Sharing with others',
      body: <p>We <b>do not give or sell</b> your information to other companies or people. The only exception is a formal request made under the law, for example by law enforcement.</p>,
    },
    {
      title: 'Service providers (processing and transfer abroad)',
      body: (
        <ul>
          <li><b>Cloudflare, Inc. (USA)</b>: domain, secure connections (https) and server connection. When you visit the site, access logs (such as your IP address) pass through Cloudflare&rsquo;s network.</li>
          <li><b>jsDelivr (font delivery)</b>: access logs may be sent when the site&rsquo;s fonts load.</li>
          <li>Account information and uploaded files are stored on servers managed by the operator (Republic of Korea).</li>
        </ul>
      ),
    },
    {
      title: 'Browser storage and cookies',
      body: <p>We save your login, your beta guest account details and the language you choose in <b>browser storage (localStorage)</b>. We don&rsquo;t use advertising or tracking cookies. Cloudflare may use cookies that are strictly necessary for security.</p>,
    },
    {
      title: 'Your rights',
      body: (
        <ul>
          <li>You can view and edit your information at any time (&lsquo;My account&rsquo;).</li>
          <li>You can delete your account at any time (&lsquo;My account → Delete account&rsquo;).</li>
          <li>For any other request to access, correct, delete or stop processing your information, contact us at the address below. We&rsquo;ll handle it promptly.</li>
        </ul>
      ),
    },
    {
      title: 'Children under 14',
      body: <p>Please don&rsquo;t sign up if you are under 14. If we learn that we have information from someone under 14, we will delete it.</p>,
    },
    {
      title: 'How we keep it safe',
      body: (
        <ul>
          <li>Passwords are stored in a form no one can read (a cryptographic hash).</li>
          <li>All connections are encrypted with https.</li>
          <li>Admin features are available only to admin accounts.</li>
        </ul>
      ),
    },
    {
      title: 'Privacy officer',
      body: (
        <>
          <p>ASMR Block operator · <a href={`mailto:${CONTACT_EMAIL}`} className="text-pink-text">{CONTACT_EMAIL}</a></p>
          <p>In Korea, you can also contact the Personal Information Infringement Report Center (dial 118, privacy.kisa.or.kr).</p>
        </>
      ),
    },
    {
      title: 'Changes',
      body: <p>If this policy changes, we&rsquo;ll announce it on the site before the change takes effect.</p>,
    },
  ],
};

export const TERMS = {
  title: 'Terms of Service',
  intro: <>Please read these terms before using ASMR Block (the &lsquo;Service&rsquo;). By signing up or tapping &lsquo;Try the beta now&rsquo;, you agree to these terms.</>,
  sections: [
    {
      title: 'The Service',
      body: <p>A service where you pick ASMR sound blocks you like, put them together into your own combos and listen to them. It is currently a <b>free beta</b>.</p>,
    },
    {
      title: 'Accounts',
      body: (
        <ul>
          <li>You can sign up with an email address, or during the beta use a guest account without signing up.</li>
          <li>A guest account is saved only in that browser or device, so you can&rsquo;t get back in after clearing your browser data, or from another device.</li>
          <li>You are responsible for your own account. Don&rsquo;t use anyone else&rsquo;s account.</li>
        </ul>
      ),
    },
    {
      title: 'Because this is a beta',
      body: (
        <ul>
          <li>Features and design change often, and the Service may be briefly unavailable for maintenance or outages.</li>
          <li>Before the official launch we may need to clean up data from the beta. If so, we&rsquo;ll let you know in advance.</li>
        </ul>
      ),
    },
    {
      title: 'Uploading blocks (creators)',
      body: (
        <ul>
          <li>Only upload sounds, videos and photos that <b>you recorded yourself or have the right to use</b>. Don&rsquo;t upload other people&rsquo;s music, videos or voices without permission.</li>
          <li>You keep the rights to the blocks you upload. However, you allow the Service to store and convert them (for example, evening out the volume or making videos smaller) and to show them so that others can listen to them, collect them and use them in combos.</li>
          <li>Uploaded blocks become public after an admin reviews them. If there is a problem, we may send them back with a reason or take them down.</li>
        </ul>
      ),
    },
    {
      title: 'Sharing combos',
      body: <p>If you save a combo as &lsquo;Public&rsquo;, others can listen to it and copy it into their own combos with &lsquo;Save all&rsquo;.</p>,
    },
    {
      title: 'Coins and paid blocks',
      body: <p>There is no payment feature yet. When coin top-ups and purchases open, we&rsquo;ll update these terms and let you know in advance.</p>,
    },
    {
      title: 'What you must not do',
      body: (
        <>
          <ul>
            <li>Upload anything illegal, or anything obscene, violent or hateful</li>
            <li>Infringe anyone&rsquo;s copyright, image rights or personal information</li>
            <li>Create accounts in bulk with automated programs, or put excessive load on the servers</li>
            <li>Deceive the Service or get in the way of other people using it</li>
          </ul>
          <p>If this happens, we may remove the content or restrict your use of the Service.</p>
        </>
      ),
    },
    {
      title: 'Liability',
      body: <p>While we offer the Service as a free beta, we do our best to keep it running and your data safe, but we can&rsquo;t be responsible for outages or data loss that aren&rsquo;t caused intentionally or by gross negligence on the operator&rsquo;s part. Please keep your important original recordings somewhere else too.</p>,
    },
    {
      title: 'Leaving',
      body: <p>You can stop using the Service at any time with &lsquo;My account → Delete account&rsquo;.</p>,
    },
    {
      title: 'Changes to these terms',
      body: <p>Before any change takes effect, we&rsquo;ll announce on the site what is changing and when.</p>,
    },
  ],
};
