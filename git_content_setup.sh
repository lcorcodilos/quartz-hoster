#! /bin/bash
mkdir -p content.git
cd content.git
git init --bare
cd ../

cat > content.git/hooks/post-receive << 'EOF'
#! /bin/sh
git --work-tree ../content checkout -qf
EOF
chmod +x content.git/hooks/post-receive
