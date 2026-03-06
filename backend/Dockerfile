# استخدم Node.js الرسمي
FROM node:18

# تحديد مكان العمل داخل الحاوية
WORKDIR /app

# نسخ ملفات المشروع
COPY package*.json ./

# تثبيت التبعيات
RUN npm install

# نسخ باقي الملفات
COPY . .

# تحديد البورت اللي هيتشغل عليه السيرفر
EXPOSE 5000

# أمر التشغيل
CMD ["node", "server.js"]
