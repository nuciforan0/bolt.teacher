# bolt.teacher

<img width="1408" height="721" alt="boltteacher preview" src="https://github.com/user-attachments/assets/35f69858-a8ff-4c89-bbf6-38c8213d914d" />

Bolt.teacher is a modified version of [bolt.diy](https://github.com/stackblitz-labs/bolt.diy). 
Bolt.teacher has been tuned specifically for teachers to create applications for their class or other educational reasons. Bolt creates an LTI 1.0 compliant applications, which can then could be shown on compatible Learning Management Services supporting LTI 1.0 such as Blackboard.

Bolt.teacher is a research project for the University of Queensland, and aims to help identify how well teachers will utilise the coming wave of generative AI to create new unique experiences for their classes & improve the quality of education. 
While it isn't requried, it is recommended to run bolt.teacher applications in a Chromium based browser such as Google Chrome

## Setup

### Prerequisites
  ##### Install Node.js
  
  1. Visit the [Node.js Download Page](https://nodejs.org/en/download/)
  2. Download the "LTS" (Long Term Support) version for your operating system
  3. Run the installer, accepting the default settings
  4. Verify Node.js is properly installed:
     - **For Windows Users**:
       1. Press `Windows + R`
       2. Type "sysdm.cpl" and press Enter
       3. Go to "Advanced" tab → "Environment Variables"
       4. Check if `Node.js` appears in the "Path" variable
     - **For Mac/Linux Users**:
       1. Open Terminal
       2. Type this command:
          ```bash
          echo $PATH
          ```
       3. Look for `/usr/local/bin` in the output

  #### Install Git
  [Download Git](https://git-scm.com/downloads)
  
### Installation
  1. Download bolt.teacher
       ```bash
       git clone https://github.com/nuciforan0/bolt.teacher.git
       ```
  2. Install Package Manager (pnpm)
      ```bash
      npm install -g pnpm
      ```
  3.   Move to the bolt.teacher directory in terminal
        ```bash
       cd bolt.teacher
       ```
  4.   Install Project dependencies
       ```bash
       pnpm install
       ```
  5.   Start the application
       ```bash
       pnpm run dev
       ```
       
Can also be installed using docker which should be the same as what is shown [here](https://github.com/stackblitz-labs/bolt.diy?tab=readme-ov-file#option-2-using-docker). We recommend using Anthropic's Claude series for the best results.

## Deployment
  There are other ways to deploy but this is what I chose to do for bolt.teache
  0. (Optional) Get API keys that you want your deployment to use, the permitted api keys and their formatted names can be seen in the [.env.example file](https://github.com/nuciforan0/bolt.teacher/blob/main/.env.example)
  1. Create a cloudflare account [here](https://pages.cloudflare.com/) and a github account [here](https://github.com/) 
  2. Create a new repository of bolt.teacher which is attached to your github account
  3. Go to the cloudflare pages [here](https://pages.cloudflare.com/) and go to the Workers & Pages page
  4. Select the Create Button -> Select the Pages subheading -> Import an existing Git repository -> Link your github account & select your cloned bolt.teacher repo -> Begin setup -> Follow the following build specifications:
  ```bash
  Production branch: main
  Framework preset: None
  Build command: npm run build
  Build output directory: /build/client

  Environment variables (advanced) -> Add variable
  Add any API keys that you are going to use here.

  Click Save and Deploy
  IMPORTANT: After deploying, you are not done yet
  ```
  
  5. Go to your deployment, click Build Settings, then go to the Project Settings. 
  6. Scroll down to Variables and Secrets and add the API keys you want to use here
  7. Go back to your deployment page, click Manage Deployment -> Retry Deployment

When it is deployed next it should run bolt.teacher, with your API keys automatically connected. Click the URL that the deployment generated. 

## Limitations
  - Due to the use of WebContainer to show a preview of the application, cannot use a proper backend other then a locally ran one in the browser, limiting use-cases in actual production settings (Sqlite with sql.js)
  - Iterate and enhance buttons shouldn't be needed but for a research preview was the form factor decided.
  - Complicated projects may need multiple prompts from the user to refine what bolt creates, and may not be possible with current AI capabilities

## Testing Created Projects 
[put annesha's code here aswell as my router.py thing] 


## Change in Prompts for bolt.teacher compared to bolt.diy

### Master prompt 

### Enhancer button prompt

### Iterator button prompt







# Licensing
**Who needs a commercial WebContainer API license?**

bolt.teacher source code is distributed as MIT, but it uses WebContainers API that [requires licensing](https://webcontainers.io/enterprise) for production usage in a commercial, for-profit setting. (Prototypes or POCs do not require a commercial license.) If you're using the API to meet the needs of your customers, prospective customers, and/or employees, you need a license to ensure compliance with our Terms of Service. Usage of the API in violation of these terms may result in your access being revoked.
