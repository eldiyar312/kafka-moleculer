pipeline {
   agent any

   stages {
	   stage('Copy build folder') {
         steps {
           echo "Copy build folder for develop..."
            sh 'ssh gitlab-runner@something rm -rf /var/www/temp_deploy/develop'
            sh 'ssh gitlab-runner@something mkdir -p /var/www/temp_deploy/develop'
            sh 'scp -r * gitlab-runner@something:/var/www/temp_deploy/develop'
            sh 'ssh gitlab-runner@something "ls -la /var/www/temp_deploy/develop"'
            sh 'ssh gitlab-runner@something "rm -rf /var/www/develop && mkdir -p /var/www/develop && mv /var/www/temp_deploy/develop/* /var/www/develop/"'
            sh 'ssh gitlab-runner@something "cp /var/www/.env /var/www/develop/"'
            echo "Copy build folder - Completed!"
         }
      }
      stage ('Docker') {
         steps {
            echo "Docker run..."
            sh 'ssh gitlab-runner@something "cd /var/www/develop && sudo docker-compose down && sudo docker-compose up -d"'
            echo "Docker run - Completed"
         }
      }
      stage ('App') {
         steps {
            echo "App running..."
            sh 'ssh gitlab-runner@something "cd /var/www/develop && npm install"'
            echo "npm modules installed!"
            echo 'ssh gitlab-runner@something "export NODE_ENV=production"'
            sh 'ssh gitlab-runner@something "cd /var/www/develop && pm2 startOrReload ecosystem.config.js"'
            echo "App run - Completed"
         }
      }
   }
}


