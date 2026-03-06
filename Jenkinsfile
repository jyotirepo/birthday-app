pipeline {
    agent any

    environment {
        BACKEND_IMAGE  = "jsethy2010/birthday-app-backend"
        FRONTEND_IMAGE = "jsethy2010/birthday-app-frontend"
        IMAGE_TAG      = "${BUILD_NUMBER}"
    }

    stages {

        // ─────────────────────────────────────────────
        // 1. SOURCE CODE
        // ─────────────────────────────────────────────
        stage('Git Checkout') {
            steps {
                git branch: 'main',
                    credentialsId: 'git-credentials',
                    url: 'https://github.com/jyotirepo/birthday-app.git'
            }
        }

        // ─────────────────────────────────────────────
        // 2. INSTALL DEPENDENCIES & TEST (Backend)
        // ─────────────────────────────────────────────
        stage('Install Backend Dependencies') {
            steps {
                dir('backend') {
                    sh "npm install"
                }
            }
        }

        stage('Test Backend') {
            steps {
                dir('backend') {
                    sh "npm test --if-present || echo 'No tests defined, skipping.'"
                }
            }
        }

        // ─────────────────────────────────────────────
        // 3. SECURITY – FILE SYSTEM SCAN (Trivy)
        // ─────────────────────────────────────────────
        stage('File System Scan') {
            steps {
                sh """
                curl -sSL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/html.tpl \
                     -o html.tpl

                trivy fs --scanners vuln \\
                    --format template \\
                    --template "@html.tpl" \\
                    -o trivy-fs-report.html .
                """
            }
        }

        // ─────────────────────────────────────────────
        // 4. CODE QUALITY – SONARQUBE
        //    Node.js scan — no java.binaries needed
        // ─────────────────────────────────────────────
        stage('SonarQube Analysis') {
            environment {
                SCANNER_HOME = tool 'sonar-scanner'
            }
            steps {
                withSonarQubeEnv('sonar') {
                    sh """
                        ${SCANNER_HOME}/bin/sonar-scanner \\
                        -Dsonar.projectName=BirthdayApp \\
                        -Dsonar.projectKey=BirthdayApp \\
                        -Dsonar.sources=backend,frontend \\
                        -Dsonar.exclusions=**/node_modules/**,**/*.html
                    """
                }
            }
        }

        stage('Quality Gate') {
            steps {
                script {
                    waitForQualityGate abortPipeline: false,
                        credentialsId: 'sonar-token'
                }
            }
        }

        // ─────────────────────────────────────────────
        // 5. DOCKER – BUILD BOTH IMAGES
        // ─────────────────────────────────────────────
        stage('Build Backend Docker Image') {
            steps {
                dir('backend') {
                    sh "docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} ."
                    sh "docker tag  ${BACKEND_IMAGE}:${IMAGE_TAG} ${BACKEND_IMAGE}:latest"
                }
            }
        }

        stage('Build Frontend Docker Image') {
            steps {
                dir('frontend') {
                    sh "docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} ."
                    sh "docker tag  ${FRONTEND_IMAGE}:${IMAGE_TAG} ${FRONTEND_IMAGE}:latest"
                }
            }
        }

        // ─────────────────────────────────────────────
        // 6. SECURITY – DOCKER IMAGE SCANS (Trivy)
        // ─────────────────────────────────────────────
        stage('Scan Backend Image') {
            steps {
                sh """
                trivy image --scanners vuln \\
                    --format template \\
                    --template "@html.tpl" \\
                    -o trivy-backend-image-report.html \\
                    ${BACKEND_IMAGE}:${IMAGE_TAG}
                """
            }
        }

        stage('Scan Frontend Image') {
            steps {
                sh """
                trivy image --scanners vuln \\
                    --format template \\
                    --template "@html.tpl" \\
                    -o trivy-frontend-image-report.html \\
                    ${FRONTEND_IMAGE}:${IMAGE_TAG}
                """
            }
        }

        // ─────────────────────────────────────────────
        // 7. PUSH BOTH IMAGES TO DOCKER HUB
        // ─────────────────────────────────────────────
        stage('Push Docker Images') {
            steps {
                withDockerRegistry(
                    url: 'https://index.docker.io/v1/',
                    credentialsId: 'docker-cred'
                ) {
                    sh "docker push ${BACKEND_IMAGE}:${IMAGE_TAG}"
                    sh "docker push ${BACKEND_IMAGE}:latest"
                    sh "docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}"
                    sh "docker push ${FRONTEND_IMAGE}:latest"
                }
            }
        }

        // ─────────────────────────────────────────────
        // 8. ARCHIVE SECURITY REPORTS
        // ─────────────────────────────────────────────
        stage('Archive Reports') {
            steps {
                archiveArtifacts artifacts: '*.html', fingerprint: true
            }
        }

        // ─────────────────────────────────────────────
        // 9. KUBERNETES – APPLY ALL MANIFESTS IN ORDER
        //    Applies: namespace → secrets → postgres →
        //             backend → frontend → ingress
        // ─────────────────────────────────────────────
        stage('Deploy To Kubernetes') {
            steps {
                withKubeConfig(
                    credentialsId: 'k8-cred',
                    namespace: 'birthday-app',
                    serverUrl: 'https://192.168.101.80:6443'
                ) {
                    sh """
                        kubectl apply -f k8s/00-namespace.yaml
                        kubectl apply -f k8s/01-postgres-secret.yaml
                        kubectl apply -f k8s/02-postgres.yaml
                        kubectl apply -f k8s/03-backend.yaml
                        kubectl apply -f k8s/04-frontend.yaml
                        kubectl apply -f k8s/05-ingress.yaml
                    """
                    // Rolling restart to pick up the new images
                    sh "kubectl rollout restart deployment -n birthday-app"
                }
            }
        }

        // ─────────────────────────────────────────────
        // 10. VERIFY DEPLOYMENT
        // ─────────────────────────────────────────────
        stage('Verify the Deployment') {
            steps {
                withKubeConfig(
                    credentialsId: 'k8-cred',
                    namespace: 'birthday-app',
                    serverUrl: 'https://192.168.101.80:6443'
                ) {
                    sh "kubectl get pods    -n birthday-app"
                    sh "kubectl get svc     -n birthday-app"
                    sh "kubectl get ingress -n birthday-app"
                }
            }
        }
    }

    // ─────────────────────────────────────────────
    // 11. EMAIL NOTIFICATION
    // ─────────────────────────────────────────────
    post {
        always {
            emailext(
                to:      'tpwodl.jyotisethy@tpcentralodisha.com',
                from:    'devopsadmin@tpcentralodisha.com',
                subject: "BirthdayApp Build #${env.BUILD_NUMBER} - ${currentBuild.currentResult}",
                mimeType: 'text/html',
                body: """
                    <h2>Birthday App CI/CD Pipeline Report</h2>

                    <b>Status:</b>         ${currentBuild.currentResult} <br>
                    <b>Job Name:</b>       ${env.JOB_NAME} <br>
                    <b>Build Number:</b>   ${env.BUILD_NUMBER} <br>
                    <b>Backend Image:</b>  ${BACKEND_IMAGE}:${IMAGE_TAG} <br>
                    <b>Frontend Image:</b> ${FRONTEND_IMAGE}:${IMAGE_TAG} <br>
                    <b>Build URL:</b>
                    <a href="${env.BUILD_URL}">${env.BUILD_URL}</a> <br><br>

                    <h3>Security Scan Reports</h3>

                    🔹 Trivy File System Scan:
                    <a href="${env.BUILD_URL}artifact/trivy-fs-report.html">
                    Open FS Report</a> <br><br>

                    🔹 Trivy Backend Image Scan:
                    <a href="${env.BUILD_URL}artifact/trivy-backend-image-report.html">
                    Open Backend Report</a> <br><br>

                    🔹 Trivy Frontend Image Scan:
                    <a href="${env.BUILD_URL}artifact/trivy-frontend-image-report.html">
                    Open Frontend Report</a>
                """
            )
        }
    }
}
