using System;

namespace IsPalindrome
{
    class Program
    {
        static void Main(string[] args)
        {
            string myString = "";
            Console.WriteLine("Enter input string");
            myString = Console.ReadLine();
            isPalindromeMethod1(myString);
            isPalindromeMethod2(myString);
            myString = Console.ReadLine();
        }

        public static void isPalindromeMethod1(string myString)
        {
            var reverseCharArray = myString.ToCharArray();
            Array.Reverse(reverseCharArray);
            string reverseString = new string(reverseCharArray);

            string isPalindrome =  myString.Equals(reverseString) ? "Input string is palindrome": "Input string is not a palindrome";
            Console.WriteLine($"Output from method 1: {isPalindrome}");
        }

        public static void isPalindromeMethod2(string myString)
        {
            string first = myString.Substring(0, myString.Length / 2);
            char[] arr   = myString.ToCharArray();

            Array.Reverse(arr);

            string temp   = new string(arr);
            string second = temp.Substring(0, temp.Length / 2);

            string isPalindrome =  first.Equals(second) ? "Input string is palindrome": "Input string is not a palindrome";
            Console.WriteLine($"Output from method 2: {isPalindrome}");
        }
    }
}
